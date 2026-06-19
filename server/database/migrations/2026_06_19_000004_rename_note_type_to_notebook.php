<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Drop old enum check, widen to text, rename existing rows
        DB::statement('ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_type_check');
        DB::statement("ALTER TABLE cards ALTER COLUMN type TYPE VARCHAR(255)");
        DB::table('cards')->where('type', 'note')->update(['type' => 'notebook']);
        // Re-add constraint including notebook
        DB::statement("ALTER TABLE cards ADD CONSTRAINT cards_type_check CHECK (type IN (
            'notebook','todo','task','bookmark','image','file',
            'audio','gif','sketch','mindmap_node','table','column','comment_anchor'
        ))");
    }

    public function down(): void
    {
        DB::statement('ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_type_check');
        DB::table('cards')->where('type', 'notebook')->update(['type' => 'note']);
        DB::statement("ALTER TABLE cards ADD CONSTRAINT cards_type_check CHECK (type IN (
            'note','todo','task','bookmark','image','file',
            'audio','gif','sketch','mindmap_node','table','column','comment_anchor'
        ))");
    }
};
