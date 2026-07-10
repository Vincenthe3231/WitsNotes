<?php

namespace Tests\Feature;

use App\Models\Attachment;
use App\Models\Board;
use App\Models\Card;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class AttachmentTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_store_creates_attachment_row_and_file(): void
    {
        Storage::fake('public');

        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $file  = UploadedFile::fake()->create('photo.png', 10, 'image/png');

        $response = $this->postJson('/api/attachments', [
            'file'    => $file,
            'card_id' => $card->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonStructure(['id', 'url', 'mime', 'size', 'original_name']);
        $this->assertDatabaseHas('attachments', ['card_id' => $card->id]);

        $attachment = Attachment::first();
        Storage::disk('public')->assertExists($attachment->path);
    }

    public function test_store_401_for_unauthenticated(): void
    {
        $card = Card::factory()->create();

        $this->postJson('/api/attachments', [
            'file'    => UploadedFile::fake()->create('photo.png', 10, 'image/png'),
            'card_id' => $card->id,
        ])->assertStatus(401);
    }

    public function test_store_403_when_card_belongs_to_other_user(): void
    {
        Storage::fake('public');

        $this->auth();
        $other = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $other->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $other->id]);

        $this->postJson('/api/attachments', [
            'file'    => UploadedFile::fake()->create('photo.png', 10, 'image/png'),
            'card_id' => $card->id,
        ])->assertStatus(403);
    }

    public function test_destroy_removes_row_and_file(): void
    {
        Storage::fake('public');

        $user       = $this->auth();
        $board      = Board::factory()->create(['user_id' => $user->id]);
        $card       = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $attachment = Attachment::factory()->create(['card_id' => $card->id, 'disk' => 'public']);
        Storage::disk('public')->put($attachment->path, 'fake');

        $this->deleteJson("/api/attachments/{$attachment->id}")->assertStatus(204);
        $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
        Storage::disk('public')->assertMissing($attachment->path);
    }

    public function test_store_422_when_file_missing(): void
    {
        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);

        $this->postJson('/api/attachments', ['card_id' => $card->id])
            ->assertStatus(422)
            ->assertJsonPath('error.code', 'validation_failed')
            ->assertJsonStructure(['error' => ['details' => ['file']]]);
    }

    public function test_store_accepts_audio_file(): void
    {
        Storage::fake('public');

        $user  = $this->auth();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $file  = UploadedFile::fake()->create('clip.mp3', 100, 'audio/mpeg');

        $response = $this->postJson('/api/attachments', [
            'file'    => $file,
            'card_id' => $card->id,
        ]);

        $response->assertStatus(201);
        $response->assertJsonFragment(['mime' => 'audio/mpeg']);
    }

    public function test_destroy_403_for_other_user(): void
    {
        Storage::fake('public');

        $this->auth();
        $other      = User::factory()->create();
        $board      = Board::factory()->create(['user_id' => $other->id]);
        $card       = Card::factory()->create(['board_id' => $board->id, 'created_by' => $other->id]);
        $attachment = Attachment::factory()->create(['card_id' => $card->id]);

        $this->deleteJson("/api/attachments/{$attachment->id}")->assertStatus(403);
    }

    public function test_card_delete_cascades_to_attachment_file(): void
    {
        Storage::fake('public');

        $user       = $this->auth();
        $board      = Board::factory()->create(['user_id' => $user->id]);
        $card       = Card::factory()->create(['board_id' => $board->id, 'created_by' => $user->id]);
        $attachment = Attachment::factory()->create(['card_id' => $card->id, 'disk' => 'public']);
        Storage::disk('public')->put($attachment->path, 'fake');

        $this->deleteJson("/api/cards/{$card->id}")->assertStatus(204);
        $this->assertDatabaseMissing('attachments', ['id' => $attachment->id]);
        Storage::disk('public')->assertMissing($attachment->path);
    }
}
