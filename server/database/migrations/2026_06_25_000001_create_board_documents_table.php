<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('board_documents', function (Blueprint $table) {
            $table->uuid('board_id')->primary();
            $table->binary('state')->nullable(); // Y.Doc encoded state vector (bytea)
            $table->timestamp('updated_at')->nullable();

            $table->foreign('board_id')->references('id')->on('boards')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('board_documents');
    }
};
