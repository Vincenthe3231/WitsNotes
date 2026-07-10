<?php

namespace App\Http\Controllers;

use App\Models\Board;
use App\Models\BoardMember;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BoardMemberController extends Controller
{
    public function index(Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        $members = $board->members()
            ->with('user:id,name,email')
            ->get()
            ->map(fn($m) => [
                'id'         => $m->id,
                'user_id'    => $m->user_id,
                'name'       => $m->user->name,
                'email'      => $m->user->email,
                'role'       => $m->role,
                'created_at' => $m->created_at,
            ]);

        // Include owner in the list
        $owner = $board->user;
        $list  = collect([[
            'id'         => null,
            'user_id'    => $owner->id,
            'name'       => $owner->name,
            'email'      => $owner->email,
            'role'       => 'owner',
            'created_at' => $board->created_at,
        ]])->concat($members);

        return response()->json($list);
    }

    public function store(Request $request, Board $board): JsonResponse
    {
        $this->authorize('manageMembers', $board);

        if ($board->is_vault) {
            return response()->json([
                'error' => [
                    'code'    => 'vault_board_not_shareable',
                    'message' => 'Vault boards cannot be shared.',
                    'details' => null,
                ],
            ], 403);
        }

        $data = $request->validate([
            'email' => ['required', 'email', 'exists:users,email'],
            'role'  => ['required', 'in:editor,viewer'],
        ]);

        $invitee = User::where('email', $data['email'])->firstOrFail();

        if ($invitee->id === $board->user_id) {
            return response()->json([
                'error' => [
                    'code'    => 'already_owner',
                    'message' => 'This user is already the board owner.',
                    'details' => null,
                ],
            ], 422);
        }

        $member = BoardMember::updateOrCreate(
            ['board_id' => $board->id, 'user_id' => $invitee->id],
            ['role' => $data['role']]
        );

        return response()->json([
            'id'         => $member->id,
            'user_id'    => $invitee->id,
            'name'       => $invitee->name,
            'email'      => $invitee->email,
            'role'       => $member->role,
            'created_at' => $member->created_at,
        ], 201);
    }

    public function update(Request $request, Board $board, BoardMember $member): JsonResponse
    {
        $this->authorize('manageMembers', $board);

        if ($member->board_id !== $board->id) {
            abort(404);
        }

        $data = $request->validate(['role' => ['required', 'in:editor,viewer']]);
        $member->update($data);

        return response()->json(['role' => $member->role]);
    }

    public function destroy(Board $board, BoardMember $member): JsonResponse
    {
        $this->authorize('manageMembers', $board);

        if ($member->board_id !== $board->id) {
            abort(404);
        }

        $member->delete();

        return response()->json(null, 204);
    }
}
