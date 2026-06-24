<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attachments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('card_id')->constrained()->cascadeOnDelete();
            // Disk name ('public', 's3', etc.) — swap disk via env, no logic change needed
            $table->string('disk')->default('public');
            $table->string('path');
            $table->string('mime');
            $table->unsignedBigInteger('size');
            $table->string('original_name');
            // Reserved for Phase 4 OCR
            $table->string('ocr_status')->nullable();
            $table->text('ocr_text')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attachments');
    }
};
