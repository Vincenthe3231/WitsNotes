<?php

namespace App\Http\Controllers;

use App\Models\Board;
use Firebase\JWT\JWT;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CollabController extends Controller
{
    public function ticket(Request $request, Board $board): JsonResponse
    {
        $this->authorize('view', $board);

        if ($board->is_vault) {
            return response()->json([
                'error' => [
                    'code'    => 'vault_board_not_shareable',
                    'message' => 'Vault boards cannot be used in collaborative mode.',
                    'details' => null,
                ],
            ], 403);
        }

        $user   = $request->user();
        $role   = $board->memberRole($user->id) ?? 'viewer';
        $secret = config('collab.jwt_secret');

        $payload = [
            'user_id'  => $user->id,
            'board_id' => $board->id,
            'role'     => $role,
            'iat'      => time(),
            'exp'      => time() + 60,
        ];

        $token = JWT::encode($payload, $secret, 'HS256');

        return response()->json(['token' => $token]);
    }
}
