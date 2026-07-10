<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement('CREATE INDEX cards_content_text_trgm_idx ON cards USING gin (content_text gin_trgm_ops)');
        DB::statement('CREATE INDEX cards_title_trgm_idx ON cards USING gin (title gin_trgm_ops)');
    }

    public function down(): void
    {
        DB::statement('DROP INDEX IF EXISTS cards_content_text_trgm_idx');
        DB::statement('DROP INDEX IF EXISTS cards_title_trgm_idx');
    }
};
