<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reminders', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('card_id');
            $table->foreign('card_id')->references('id')->on('cards')->cascadeOnDelete();
            $table->timestamp('remind_at');
            $table->timestamp('sent_at')->nullable();
            $table->timestamps();

            // One dispatch record per (card, remind_at) — reschedules land as a
            // new row since remind_at changed, so a stale "already sent" row
            // for the old time never blocks the new one.
            $table->unique(['card_id', 'remind_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reminders');
    }
};
