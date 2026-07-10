<?php

namespace App\Policies;

use App\Models\Board;
use App\Models\User;

class BoardPolicy
{
    public function view(User $user, Board $board): bool
    {
        return $board->user_id === $user->id
            || $board->members()->where('user_id', $user->id)->exists();
    }

    public function update(User $user, Board $board): bool
    {
        if ($board->user_id === $user->id) return true;
        $role = $board->members()->where('user_id', $user->id)->value('role');
        return $role === 'editor';
    }

    public function delete(User $user, Board $board): bool
    {
        return $board->user_id === $user->id;
    }

    public function manageMembers(User $user, Board $board): bool
    {
        return $board->user_id === $user->id;
    }
}
