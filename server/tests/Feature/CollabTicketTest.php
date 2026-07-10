<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\User;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CollabTicketTest extends TestCase
{
    use RefreshDatabase;

    private string $secret = 'test-secret-32-chars-long-padding';

    protected function setUp(): void
    {
        parent::setUp();
        config(['collab.jwt_secret' => $this->secret]);
    }

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_owner_receives_valid_ticket(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);

        $response = $this->getJson("/api/boards/{$board->id}/collab-ticket");

        $response->assertStatus(200)->assertJsonStructure(['token']);

        $token = $response->json('token');
        $decoded = JWT::decode($token, new Key($this->secret, 'HS256'));

        $this->assertEquals($user->id, $decoded->user_id);
        $this->assertEquals($board->id, $decoded->board_id);
        $this->assertEquals('owner', $decoded->role);
        $this->assertGreaterThan(time(), $decoded->exp);
    }

    public function test_non_owner_gets_403(): void
    {
        $this->auth(); // logged in as someone else
        $board = Board::factory()->create(['user_id' => User::factory()->create()->id]);

        $this->getJson("/api/boards/{$board->id}/collab-ticket")->assertStatus(403);
    }

    public function test_unauthenticated_gets_401(): void
    {
        $board = Board::factory()->create(['user_id' => User::factory()->create()->id]);

        $this->getJson("/api/boards/{$board->id}/collab-ticket")->assertStatus(401);
    }

    public function test_vault_board_returns_403(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create([
            'user_id'  => $user->id,
            'is_vault' => true,
        ]);

        $this->getJson("/api/boards/{$board->id}/collab-ticket")
            ->assertStatus(403)
            ->assertJsonPath('error.code', 'vault_board_not_shareable');
    }
}
