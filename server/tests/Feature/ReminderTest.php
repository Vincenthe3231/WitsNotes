<?php

namespace Tests\Feature;

use App\Mail\ReminderMail;
use App\Models\Board;
use App\Models\Card;
use App\Models\Reminder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Tests\TestCase;

class ReminderTest extends TestCase
{
    use RefreshDatabase;

    private function auth(): User
    {
        $user = User::factory()->create();
        $this->actingAs($user, 'sanctum');
        return $user;
    }

    public function test_dispatch_due_command_sends_mail_and_records_a_reminder(): void
    {
        Mail::fake();
        $user  = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $card  = Card::factory()->create([
            'board_id'   => $board->id,
            'created_by' => $user->id,
            'title'      => 'Renew passport',
            'remind_at'  => now()->subMinute(),
        ]);

        $this->artisan('reminders:dispatch-due')->assertExitCode(0);

        Mail::assertQueued(ReminderMail::class, fn($mail) => $mail->card->id === $card->id);
        $this->assertDatabaseHas('reminders', ['card_id' => $card->id]);
        $this->assertNotNull(Reminder::where('card_id', $card->id)->first()->sent_at);
    }

    public function test_dispatch_due_command_skips_cards_not_yet_due(): void
    {
        Mail::fake();
        $user  = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $user->id]);
        Card::factory()->create([
            'board_id'   => $board->id,
            'created_by' => $user->id,
            'remind_at'  => now()->addHour(),
        ]);

        $this->artisan('reminders:dispatch-due')->assertExitCode(0);

        Mail::assertNothingQueued();
        $this->assertDatabaseCount('reminders', 0);
    }

    public function test_dispatch_due_command_does_not_resend_an_already_sent_reminder(): void
    {
        Mail::fake();
        $user  = User::factory()->create();
        $board = Board::factory()->create(['user_id' => $user->id]);
        $remindAt = now()->subMinute();
        $card  = Card::factory()->create([
            'board_id'   => $board->id,
            'created_by' => $user->id,
            'remind_at'  => $remindAt,
        ]);
        Reminder::create(['card_id' => $card->id, 'remind_at' => $remindAt, 'sent_at' => now()]);

        $this->artisan('reminders:dispatch-due')->assertExitCode(0);

        Mail::assertNothingQueued();
    }

    public function test_agenda_returns_cards_with_due_or_remind_dates_across_owned_and_member_boards(): void
    {
        $user   = $this->auth();
        $own    = Board::factory()->create(['user_id' => $user->id]);
        $withDue = Card::factory()->create(['board_id' => $own->id, 'created_by' => $user->id, 'due_at' => now()->addDay()]);
        Card::factory()->create(['board_id' => $own->id, 'created_by' => $user->id]); // no due/remind — excluded

        $response = $this->getJson('/api/cards/agenda')->assertStatus(200);
        $ids = array_column($response->json(), 'id');

        $this->assertContains($withDue->id, $ids);
        $this->assertCount(1, $ids);
    }
}
