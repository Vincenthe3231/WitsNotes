<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\Card;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CardConflictTest extends TestCase
{
    use RefreshDatabase;

    private function actingAsWithToken(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_stale_base_updated_at_returns_409_with_fresh_card(): void
    {
        $user  = $this->actingAsWithToken();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $response = $this->patchJson("/api/cards/{$card->id}", [
            'title'           => 'New title',
            'base_updated_at' => '1970-01-01T00:00:00.000Z',
        ]);

        $response->assertStatus(409);
        $response->assertJsonPath('error.code', 'card_conflict');
        $response->assertJsonPath('error.details.current.id', $card->id);
    }

    public function test_matching_base_updated_at_returns_200_and_applies_update(): void
    {
        $user  = $this->actingAsWithToken();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $response = $this->patchJson("/api/cards/{$card->id}", [
            'title'           => 'Updated title',
            'base_updated_at' => $card->updated_at->toISOString(),
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Updated title');
    }

    public function test_missing_base_updated_at_applies_last_write_wins(): void
    {
        $user  = $this->actingAsWithToken();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $response = $this->patchJson("/api/cards/{$card->id}", [
            'title' => 'Last write',
        ]);

        $response->assertStatus(200);
        $response->assertJsonPath('title', 'Last write');
    }
}
