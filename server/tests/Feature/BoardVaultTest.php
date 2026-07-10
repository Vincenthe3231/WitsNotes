<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardVaultTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_owner_can_enable_vault(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id, 'is_vault' => false]);

        $this->postJson("/api/boards/{$board->id}/vault", [
            'vault_salt'     => 'deadbeef',
            'vault_verifier' => 'ciphertext-base64',
        ])
            ->assertStatus(200)
            ->assertJsonPath('is_vault', true)
            ->assertJsonPath('vault_salt', 'deadbeef');

        $this->assertDatabaseHas('boards', [
            'id'       => $board->id,
            'is_vault' => true,
        ]);
    }

    public function test_non_owner_gets_403(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);

        $this->postJson("/api/boards/{$board->id}/vault", [
            'vault_salt'     => 'deadbeef',
            'vault_verifier' => 'ciphertext-base64',
        ])->assertStatus(403);
    }

    public function test_cannot_enable_vault_on_shared_board(): void
    {
        $user   = $this->auth();
        $board  = Board::factory()->create(['user_id' => $user->id]);
        $member = User::factory()->create();
        BoardMember::create(['board_id' => $board->id, 'user_id' => $member->id, 'role' => 'viewer']);

        $this->postJson("/api/boards/{$board->id}/vault", [
            'vault_salt'     => 'deadbeef',
            'vault_verifier' => 'ciphertext-base64',
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'vault_requires_no_members');
    }

    public function test_422_when_fields_missing(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $this->postJson("/api/boards/{$board->id}/vault", [])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed');
    }
}
