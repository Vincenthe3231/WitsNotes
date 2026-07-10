<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('board_members', function (Blueprint $table) {
            $table->uuid('id')->primary()->default(DB::raw('gen_random_uuid()'));
            $table->uuid('board_id');
            $table->unsignedBigInteger('user_id');
            $table->enum('role', ['owner', 'editor', 'viewer'])->default('editor');
            $table->timestamps();

            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->unique(['board_id', 'user_id']);
            $table->index('board_id');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_members');
    }
};
