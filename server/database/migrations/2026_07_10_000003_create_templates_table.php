<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('templates', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->string('scope')->default('system'); // 'system' (seeded) vs future 'user' (saved-as-template)
            $table->string('category');
            $table->string('name');
            $table->string('preview_url')->nullable();
            $table->jsonb('doc'); // { board: {style}, cards: [{type,x,y,w,h,z,rotation,title,content,content_text}] }
            $table->timestamps();

            $table->index(['scope', 'category']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('templates');
    }
};
