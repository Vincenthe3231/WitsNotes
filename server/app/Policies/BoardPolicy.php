<?php

namespace App\Policies;

use App\Models\Board;
use App\Models\User;

class BoardPolicy
{
    public function view(User $user, Board $board): bool
    {
        return $board->user_id === $user->id;
    }

    public function update(User $user, Board $board): bool
    {
        return $board->user_id === $user->id;
    }

    public function delete(User $user, Board $board): bool
    {
        return $board->user_id === $user->id;
    }
}
