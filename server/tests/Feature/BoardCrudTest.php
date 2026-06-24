<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardCrudTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_index_returns_own_boards(): void
    {
        $user  = $this->auth();
        $other = User::factory()->create();
        Board::factory()->create(['user_id' => $user->id]);
        Board::factory()->create(['user_id' => $other->id]);

        $this->getJson('/api/boards')->assertStatus(200)->assertJsonCount(1);
    }

    public function test_store_creates_board(): void
    {
        $this->auth();

        $this->postJson('/api/boards', ['title' => 'My Board'])
            ->assertStatus(201)
            ->assertJsonPath('title', 'My Board');
    }

    public function test_show_returns_board_with_cards(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $this->getJson("/api/boards/{$board->id}")->assertStatus(200)->assertJsonPath('id', $board->id);
    }

    public function test_show_403_for_other_user(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);

        $this->getJson("/api/boards/{$board->id}")->assertStatus(403);
    }

    public function test_update_changes_title(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $this->patchJson("/api/boards/{$board->id}", ['title' => 'Updated'])
            ->assertStatus(200)
            ->assertJsonPath('title', 'Updated');
    }

    public function test_update_403_for_other_user(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);

        $this->patchJson("/api/boards/{$board->id}", ['title' => 'Hack'])->assertStatus(403);
    }

    public function test_destroy_removes_board(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $this->deleteJson("/api/boards/{$board->id}")->assertStatus(204);
        $this->assertSoftDeleted('boards', ['id' => $board->id]);
    }

    public function test_destroy_403_for_other_user(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);

        $this->deleteJson("/api/boards/{$board->id}")->assertStatus(403);
    }
}
