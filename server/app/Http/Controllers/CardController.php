<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\SanitizesUtf8;
use App\Models\Board;
use App\Models\Card;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardController extends Controller
{
    use SanitizesUtf8;


    public function index(Board $board): JsonResponse
    {
        $this->authorize('view', $board);
        return response()->json($board->cards()->orderBy('z')->get());
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board);

        $data = $request->validate([
            'type'         => ['required', 'string'],
            'title'        => ['nullable', 'string', 'max:255'],
            'x'            => ['numeric'],
            'y'            => ['numeric'],
            'w'            => ['numeric'],
            'h'            => ['numeric'],
            'z'            => ['integer'],
            'rotation'     => ['numeric'],
            'style'        => ['nullable', 'array'],
            'content'      => ['nullable', 'array'],
            'content_text' => ['nullable', 'string'],
            'due_at'       => ['nullable', 'date'],
            'remind_at'    => ['nullable', 'date'],
        ]);

        $card = $board->cards()->create([
            ...$this->sanitizeUtf8($data),
            'created_by' => $request->user()->id,
        ]);

        return response()->json($card, 201);
    }

    public function show(Card $card): JsonResponse
    {
        $this->authorize('view', $card->board);
        return response()->json($card);
    }

    public function update(Request $request, Card $card): JsonResponse
    {
        $this->authorize('update', $card->board);

        $data = $request->validate([
            'title'            => ['sometimes', 'nullable', 'string', 'max:255'],
            'x'                => ['sometimes', 'numeric'],
            'y'                => ['sometimes', 'numeric'],
            'w'                => ['sometimes', 'numeric'],
            'h'                => ['sometimes', 'numeric'],
            'z'                => ['sometimes', 'integer'],
            'rotation'         => ['sometimes', 'numeric'],
            'style'            => ['nullable', 'array'],
            'content'          => ['nullable', 'array'],
            'content_text'     => ['nullable', 'string'],
            'due_at'           => ['nullable', 'date'],
            'remind_at'        => ['nullable', 'date'],
            'base_updated_at'  => ['sometimes', 'nullable', 'string'],
        ]);

        if (
            isset($data['base_updated_at']) &&
            $data['base_updated_at'] !== null &&
            $card->updated_at->toISOString() !== $data['base_updated_at']
        ) {
            $card->refresh();
            return ApiError::render(
                'card_conflict',
                'Card was modified elsewhere.',
                409,
                ['current' => $card]
            );
        }

        unset($data['base_updated_at']);
        $card->update($this->sanitizeUtf8($data));

        return response()->json($card);
    }

    public function destroy(Card $card): JsonResponse
    {
        $this->authorize('delete', $card->board);
        $card->delete();
        return response()->json(null, 204);
    }

    /** Cards with a due/remind date, across every board the user owns or is a member of. */
    public function agenda(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $cards = Card::whereHas('board', fn($query) => $query
                ->where('user_id', $userId)
                ->orWhereHas('members', fn($m) => $m->where('user_id', $userId))
            )
            ->where(fn($query) => $query->whereNotNull('due_at')->orWhereNotNull('remind_at'))
            ->orderByRaw('coalesce(due_at, remind_at) asc')
            ->get(['id', 'board_id', 'type', 'title', 'due_at', 'remind_at']);

        return response()->json($cards);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:1', 'max:200']]);
        $q     = $request->input('q');
        $limit = (int) $request->input('limit', 20);

        // Fuzzy match via pg_trgm: `%` catches typo/near matches that similarity()
        // alone would score too low; `ilike` still catches short substrings inside
        // long content_text that trigram similarity underweights. Rank by the best
        // of the two similarity scores so close matches surface first.
        $cards = Card::whereHas('board', fn($query) => $query->where('user_id', $request->user()->id))
            ->where(function ($query) use ($q) {
                $query->whereRaw('title % ?', [$q])
                      ->orWhereRaw('content_text % ?', [$q])
                      ->orWhere('title', 'ilike', "%{$q}%")
                      ->orWhere('content_text', 'ilike', "%{$q}%");
            })
            ->selectRaw(
                'id, board_id, type, title, content_text, ' .
                'greatest(similarity(coalesce(title, \'\'), ?), similarity(coalesce(content_text, \'\'), ?)) as rank',
                [$q, $q]
            )
            ->orderByDesc('rank')
            ->limit($limit)
            ->get();

        return response()->json($cards);
    }
}
