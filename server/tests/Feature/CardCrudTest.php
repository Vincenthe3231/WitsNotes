<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Card;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardCrudTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_store_creates_card(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $this->postJson("/api/boards/{$board->id}/cards", [
            'type' => 'note', 'x' => 100, 'y' => 100, 'w' => 320, 'h' => 200, 'z' => 10, 'rotation' => 0,
        ])->assertStatus(201)->assertJsonPath('type', 'note');
    }

    public function test_store_403_for_other_board(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);

        $this->postJson("/api/boards/{$board->id}/cards", [
            'type' => 'note', 'x' => 0, 'y' => 0, 'w' => 100, 'h' => 100, 'z' => 1, 'rotation' => 0,
        ])->assertStatus(403);
    }

    public function test_update_changes_title(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $this->patchJson("/api/cards/{$card->id}", ['title' => 'New title'])
            ->assertStatus(200)
            ->assertJsonPath('title', 'New title');
    }

    public function test_update_403_for_other_user(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $other->id]);

        $this->patchJson("/api/cards/{$card->id}", ['title' => 'Hack'])->assertStatus(403);
    }

    public function test_destroy_removes_card(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $this->deleteJson("/api/cards/{$card->id}")->assertStatus(204);
        $this->assertSoftDeleted('cards', ['id' => $card->id]);
    }

    public function test_destroy_403_for_other_user(): void
    {
        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $other->id]);

        $this->deleteJson("/api/cards/{$card->id}")->assertStatus(403);
    }

    public function test_search_returns_matching_cards(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        Card::factory()->create([
            'board_id'     => $board->id,
            'created_by'   => $user->id,
            'title'        => 'Unique search term',
            'content_text' => null,
        ]);

        $this->getJson('/api/cards/search?q=Unique')
            ->assertStatus(200)
            ->assertJsonCount(1);
    }
}
