<?php

namespace Tests\Feature;

use App\Models\Board;
use App\Models\BoardMember;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BoardMemberTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    // --- BoardPolicy ---

    public function test_owner_can_view_board(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $this->getJson("/api/boards/{$board->id}")->assertStatus(200);
    }

    public function test_member_can_view_board(): void
    {
        $owner  = User::factory()->create();
        $member = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        BoardMember::create(['board_id' => $board->id, 'user_id' => $member->id, 'role' => 'viewer']);

        $this->getJson("/api/boards/{$board->id}")->assertStatus(200);
    }

    public function test_non_member_cannot_view_board(): void
    {
        $this->auth();
        $board = Board::factory()->create(['user_id' => User::factory()->create()->id]);
        $this->getJson("/api/boards/{$board->id}")->assertStatus(403);
    }

    public function test_editor_can_update_board(): void
    {
        $owner  = User::factory()->create();
        $editor = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        BoardMember::create(['board_id' => $board->id, 'user_id' => $editor->id, 'role' => 'editor']);

        $this->patchJson("/api/boards/{$board->id}", ['title' => 'New Title'])->assertStatus(200);
    }

    public function test_viewer_cannot_update_board(): void
    {
        $owner  = User::factory()->create();
        $viewer = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        BoardMember::create(['board_id' => $board->id, 'user_id' => $viewer->id, 'role' => 'viewer']);

        $this->patchJson("/api/boards/{$board->id}", ['title' => 'Hijack'])->assertStatus(403);
    }

    public function test_only_owner_can_delete_board(): void
    {
        $owner  = User::factory()->create();
        $editor = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        BoardMember::create(['board_id' => $board->id, 'user_id' => $editor->id, 'role' => 'editor']);

        $this->deleteJson("/api/boards/{$board->id}")->assertStatus(403);
    }

    // --- BoardMemberController ---

    public function test_owner_can_invite_member(): void
    {
        $owner   = $this->auth();
        $board   = Board::factory()->create(['user_id' => $owner->id]);
        $invitee = User::factory()->create();

        $this->postJson("/api/boards/{$board->id}/members", [
            'email' => $invitee->email,
            'role'  => 'editor',
        ])->assertStatus(201)->assertJsonPath('email', $invitee->email);
    }

    public function test_non_owner_cannot_invite_member(): void
    {
        $owner  = User::factory()->create();
        $editor = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        BoardMember::create(['board_id' => $board->id, 'user_id' => $editor->id, 'role' => 'editor']);

        $invitee = User::factory()->create();
        $this->postJson("/api/boards/{$board->id}/members", [
            'email' => $invitee->email,
            'role'  => 'editor',
        ])->assertStatus(403);
    }

    public function test_vault_board_cannot_be_shared(): void
    {
        $owner   = $this->auth();
        $board   = Board::factory()->create(['user_id' => $owner->id, 'is_vault' => true]);
        $invitee = User::factory()->create();

        $this->postJson("/api/boards/{$board->id}/members", [
            'email' => $invitee->email,
            'role'  => 'editor',
        ])->assertStatus(403)->assertJsonPath('error.code', 'vault_board_not_shareable');
    }

    public function test_owner_can_update_member_role(): void
    {
        $owner  = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        $invitee = User::factory()->create();
        $member = BoardMember::create(['board_id' => $board->id, 'user_id' => $invitee->id, 'role' => 'editor']);

        $this->patchJson("/api/boards/{$board->id}/members/{$member->id}", ['role' => 'viewer'])
            ->assertStatus(200)
            ->assertJsonPath('role', 'viewer');
    }

    public function test_owner_can_remove_member(): void
    {
        $owner  = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        $invitee = User::factory()->create();
        $member = BoardMember::create(['board_id' => $board->id, 'user_id' => $invitee->id, 'role' => 'editor']);

        $this->deleteJson("/api/boards/{$board->id}/members/{$member->id}")->assertStatus(204);
        $this->assertDatabaseMissing('board_members', ['id' => $member->id]);
    }

    public function test_board_show_returns_my_role_and_has_members(): void
    {
        $owner  = $this->auth();
        $board  = Board::factory()->create(['user_id' => $owner->id]);
        $invitee = User::factory()->create();
        BoardMember::create(['board_id' => $board->id, 'user_id' => $invitee->id, 'role' => 'editor']);

        $this->getJson("/api/boards/{$board->id}")
            ->assertStatus(200)
            ->assertJsonPath('my_role', 'owner')
            ->assertJsonPath('has_members', true);
    }
}
