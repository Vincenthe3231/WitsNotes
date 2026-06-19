<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $boards = $request->user()->boards()->latest()->get();
        return response()->json($boards);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'title'       => ['required', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'is_vault'    => ['boolean'],
            'style'       => ['nullable', 'array'],
        ]);

        $board = $request->user()->boards()->create($data);

        return response()->json($board, 201);
    }

    public function show(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);
        return response()->json($board->load('cards'));
    }

    public function update(Request $request, Board $board): JsonResponse
    {
        $this->authorize('update', $board);

        $data = $request->validate([
            'title'       => ['sometimes', 'string', 'max:255'],
            'description' => ['nullable', 'string'],
            'style'       => ['nullable', 'array'],
        ]);

        $board->update($data);

        return response()->json($board);
    }

    public function destroy(Request $request, Board $board): JsonResponse
    {
        $this->authorize('delete', $board);
        $board->delete();
        return response()->json(null, 204);
    }
}
