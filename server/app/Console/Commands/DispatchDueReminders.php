<?php

namespace App\Console\Commands;

use App\Mail\ReminderMail;
use App\Models\Card;
use App\Models\Reminder;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class DispatchDueReminders extends Command
{
    protected $signature = 'reminders:dispatch-due';
    protected $description = 'Sends (and records) reminder emails for cards whose remind_at has passed and hasn\'t been sent yet.';

    public function handle(): int
    {
        $due = Card::query()
            ->whereNotNull('remind_at')
            ->where('remind_at', '<=', now())
            ->whereDoesntHave('reminders', fn($q) => $q->whereColumn('remind_at', 'cards.remind_at')->whereNotNull('sent_at'))
            ->with('board.user')
            ->get();

        foreach ($due as $card) {
            $reminder = Reminder::firstOrCreate(
                ['card_id' => $card->id, 'remind_at' => $card->remind_at],
            );
            if ($reminder->sent_at) {
                continue;
            }

            Mail::to($card->board->user->email)->queue(new ReminderMail($card));
            $reminder->update(['sent_at' => now()]);
        }

        $this->info("Dispatched {$due->count()} reminder(s).");
        return self::SUCCESS;
    }
}
