<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Concerns\SanitizesUtf8;
use App\Models\Board;
use App\Models\BoardDocument;
use App\Models\Card;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CollabInternalController extends Controller
{
    use SanitizesUtf8;

    /**
     * GET /api/internal/boards/{board}/ydoc
     *
     * Returns the stored Y.Doc blob (base64) for the sidecar to seed from on load.
     * If no blob yet, returns the current cards snapshot so the sidecar can build
     * an initial Y.Doc.
     */
    public function show(Board $board): JsonResponse
    {
        $doc = $board->document;

        if ($doc && $doc->state !== null) {
            return response()->json([
                'state' => base64_encode($doc->state),
                'cards' => null,
            ]);
        }

        // No blob yet — send cards so sidecar can seed Y.Doc
        $cards = $board->cards()
            ->whereNull('deleted_at')
            ->get(['id', 'type', 'title', 'x', 'y', 'w', 'h', 'z', 'rotation',
                   'style', 'content', 'content_text', 'due_at', 'remind_at', 'created_by'])
            ->toArray();

        return response()->json(['state' => null, 'cards' => $cards]);
    }

    /**
     * PUT /api/internal/boards/{board}/ydoc
     *
     * Called by the sidecar (debounced) to persist the Y.Doc blob and project
     * the card snapshot back into the cards table (upsert + soft-delete missing).
     *
     * Body: { state: base64_string, cards: Card[] }
     */
    public function store(Request $request, Board $board): JsonResponse
    {
        $validated = $request->validate([
            'state'             => ['required', 'string'],
            'cards'             => ['required', 'array'],
            'cards.*.id'        => ['required', 'string'],
            'cards.*.type'      => ['required', 'string'],
            'cards.*.x'         => ['required', 'numeric'],
            'cards.*.y'         => ['required', 'numeric'],
            'cards.*.w'         => ['required', 'numeric'],
            'cards.*.h'         => ['required', 'numeric'],
            'cards.*.z'         => ['nullable', 'integer'],
            'cards.*.rotation'  => ['nullable', 'numeric'],
            'cards.*.title'     => ['nullable', 'string'],
            'cards.*.content'   => ['nullable', 'array'],
            'cards.*.content_text' => ['nullable', 'string'],
            'cards.*.due_at'    => ['nullable', 'string'],
            'cards.*.remind_at' => ['nullable', 'string'],
            'cards.*.created_by'=> ['nullable'],
        ]);

        DB::transaction(function () use ($validated, $board) {
            // Persist Y.Doc blob
            BoardDocument::updateOrCreate(
                ['board_id' => $board->id],
                ['state' => base64_decode($validated['state']), 'updated_at' => now()]
            );

            $incomingIds = collect($validated['cards'])->pluck('id')->all();

            // Upsert cards from snapshot
            foreach ($validated['cards'] as $cardData) {
                $attrs = array_merge($this->sanitizeUtf8($cardData), [
                    'board_id'   => $board->id,
                    'deleted_at' => null,
                ]);
                // Never overwrite created_by with null/empty — the REST create already set it
                // and the column is NOT NULL. updateOrCreate matches on id and leaves it intact.
                if (empty($attrs['created_by'])) {
                    unset($attrs['created_by']);
                }
                Card::withTrashed()->updateOrCreate(
                    ['id' => $cardData['id']],
                    $attrs
                );
            }

            // Soft-delete cards not in snapshot (removed in Y.Doc)
            $board->cards()
                ->whereNotIn('id', $incomingIds)
                ->update(['deleted_at' => now()]);
        });

        return response()->json(['ok' => true]);
    }
}
