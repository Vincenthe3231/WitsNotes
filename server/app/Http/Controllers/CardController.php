<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Card;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CardController extends Controller
{
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
            ...$data,
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
            'title'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'x'            => ['sometimes', 'numeric'],
            'y'            => ['sometimes', 'numeric'],
            'w'            => ['sometimes', 'numeric'],
            'h'            => ['sometimes', 'numeric'],
            'z'            => ['sometimes', 'integer'],
            'rotation'     => ['sometimes', 'numeric'],
            'style'        => ['nullable', 'array'],
            'content'      => ['nullable', 'array'],
            'content_text' => ['nullable', 'string'],
            'due_at'       => ['nullable', 'date'],
            'remind_at'    => ['nullable', 'date'],
        ]);

        $card->update($data);

        return response()->json($card);
    }

    public function destroy(Card $card): JsonResponse
    {
        $this->authorize('delete', $card->board);
        $card->delete();
        return response()->json(null, 204);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['q' => ['required', 'string', 'min:1', 'max:200']]);
        $q     = $request->input('q');
        $limit = (int) $request->input('limit', 20);

        $cards = Card::whereHas('board', fn($query) => $query->where('user_id', $request->user()->id))
            ->where(function ($query) use ($q) {
                $query->where('title', 'ilike', "%{$q}%")
                      ->orWhere('content_text', 'ilike', "%{$q}%");
            })
            ->limit($limit)
            ->get(['id', 'board_id', 'type', 'title', 'content_text']);

        return response()->json($cards);
    }
}
