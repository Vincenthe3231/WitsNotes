<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cards', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('board_id');
            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->enum('type', [
                'note', 'todo', 'task', 'bookmark', 'image', 'file',
                'audio', 'gif', 'sketch', 'mindmap_node', 'table',
                'column', 'comment_anchor',
            ])->default('note');
            $table->float('x')->default(0);
            $table->float('y')->default(0);
            $table->float('w')->default(320);
            $table->float('h')->default(200);
            $table->integer('z')->default(10);
            $table->float('rotation')->default(0);
            $table->jsonb('style')->nullable();
            $table->jsonb('content')->nullable();
            $table->text('content_text')->nullable();
            $table->timestamp('due_at')->nullable();
            $table->timestamp('remind_at')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['board_id', 'type']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cards');
    }
};
