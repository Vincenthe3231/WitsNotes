<?php

namespace App\Mail;

use App\Models\Card;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class ReminderMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public Card $card)
    {
    }

    public function build(): self
    {
        return $this
            ->subject('Reminder: ' . ($this->card->title ?: 'Untitled card'))
            ->text('mail.reminder', ['card' => $this->card]);
    }
}
