<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\Connection;
use App\Support\ApiError;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConnectionController extends Controller
{
    public function index(Board $board): JsonResponse
    {
        $this->authorize('view', $board);
        return response()->json($board->connections()->get());
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board);

        $data = $request->validate([
            'from_card_id' => ['required', 'uuid', 'exists:cards,id', 'different:to_card_id'],
            'to_card_id'   => ['required', 'uuid', 'exists:cards,id'],
            'kind'         => ['sometimes', 'in:arrow,line,link'],
            'style'        => ['nullable', 'array'],
        ]);

        // Both endpoints must belong to this board — exists:cards,id alone
        // doesn't scope by board_id.
        $cardIds = $board->cards()->whereIn('id', [$data['from_card_id'], $data['to_card_id']])->pluck('id');
        if (!$cardIds->contains($data['from_card_id']) || !$cardIds->contains($data['to_card_id'])) {
            return ApiError::render(
                'connection_cards_must_share_board',
                'Both cards must belong to this board.',
                422
            );
        }

        $connection = $board->connections()->create($data);

        return response()->json($connection, 201);
    }

    public function destroy(Connection $connection): JsonResponse
    {
        $this->authorize('update', $connection->board);
        $connection->delete();
        return response()->json(null, 204);
    }
}
