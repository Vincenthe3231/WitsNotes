<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Card;
use App\Models\Connection;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConnectionTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_store_creates_connection(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $b = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $this->postJson("/api/boards/{$board->id}/connections", [
            'from_card_id' => $a->id,
            'to_card_id'   => $b->id,
            'kind'         => 'arrow',
        ])
            ->assertStatus(201)
            ->assertJsonPath('from_card_id', $a->id)
            ->assertJsonPath('to_card_id', $b->id)
            ->assertJsonPath('kind', 'arrow');

        $this->assertDatabaseHas('connections', [
            'board_id'     => $board->id,
            'from_card_id' => $a->id,
            'to_card_id'   => $b->id,
        ]);
    }

    public function test_index_returns_board_connections(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $b = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        Connection::create(['board_id' => $board->id, 'from_card_id' => $a->id, 'to_card_id' => $b->id]);

        $this->getJson("/api/boards/{$board->id}/connections")
            ->assertStatus(200)
            ->assertJsonCount(1);
    }

    public function test_store_rejects_card_from_another_board(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $otherBoard = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $foreign = Card::factory()->create(['board_id' => $otherBoard->id, 'created_by' => $user->id]);

        $this->postJson("/api/boards/{$board->id}/connections", [
            'from_card_id' => $a->id,
            'to_card_id'   => $foreign->id,
        ])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'connection_cards_must_share_board');
    }

    public function test_store_rejects_self_connection(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $this->postJson("/api/boards/{$board->id}/connections", [
            'from_card_id' => $a->id,
            'to_card_id'   => $a->id,
        ])->assertStatus(422);
    }

    public function test_store_403_for_viewer(): void
    {
        $this->auth();
        $owner = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $owner->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $owner->id]);
        $b = Card::factory()->create(['board_id' => $board->id, 'created_by' => $owner->id]);

        $this->postJson("/api/boards/{$board->id}/connections", [
            'from_card_id' => $a->id,
            'to_card_id'   => $b->id,
        ])->assertStatus(403);
    }

    public function test_destroy_removes_connection(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $b = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $connection = Connection::create(['board_id' => $board->id, 'from_card_id' => $a->id, 'to_card_id' => $b->id]);

        $this->deleteJson("/api/connections/{$connection->id}")->assertStatus(204);
        $this->assertDatabaseMissing('connections', ['id' => $connection->id]);
    }

    public function test_deleting_a_card_cascades_to_its_connections(): void
    {
        $user = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $a = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $b = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $connection = Connection::create(['board_id' => $board->id, 'from_card_id' => $a->id, 'to_card_id' => $b->id]);

        $a->forceDelete();

        $this->assertDatabaseMissing('connections', ['id' => $connection->id]);
    }
}
