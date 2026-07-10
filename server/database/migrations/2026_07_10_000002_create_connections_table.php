<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('connections', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('board_id');
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
            $table->uuid('from_card_id');
            $table->foreign('from_card_id')->references('id')->on('cards')->cascadeOnDelete();
            $table->uuid('to_card_id');
            $table->foreign('to_card_id')->references('id')->on('cards')->cascadeOnDelete();
            $table->enum('kind', ['arrow', 'line', 'link'])->default('arrow');
            $table->jsonb('style')->nullable();
            $table->timestamps();

            $table->index(['board_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('connections');
    }
};
