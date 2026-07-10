<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        // Own boards
        $ownBoards = $request->user()->boards()->withCount('members')->latest()->get()
            ->map(fn($b) => array_merge($b->toArray(), [
                'my_role'     => 'owner',
                'has_members' => $b->members_count > 0,
            ]));

        // Boards shared with user
        $sharedBoards = \App\Models\BoardMember::where('user_id', $userId)
            ->with(['board' => fn($q) => $q->withCount('members')])
            ->get()
            ->filter(fn($m) => $m->board !== null)
            ->map(fn($m) => array_merge($m->board->toArray(), [
                'my_role'     => $m->role,
                'has_members' => $m->board->members_count > 0,
            ]));

        return response()->json($ownBoards->concat($sharedBoards)->values());
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

        $user      = $request->user();
        $myRole    = $board->memberRole($user->id);
        $hasMembers = $board->members()->exists();

        return response()->json(array_merge($board->load('cards')->toArray(), [
            'my_role'     => $myRole,
            'has_members' => $hasMembers,
        ]));
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
