<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_type_check");
        DB::statement("ALTER TABLE cards ADD CONSTRAINT cards_type_check CHECK (type IN (
            'note','notebook','todo','task','bookmark','image','file','audio','gif',
            'sketch','mindmap_node','table','column','comment_anchor','link_list'
        ))");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE cards DROP CONSTRAINT IF EXISTS cards_type_check");
        DB::statement("ALTER TABLE cards ADD CONSTRAINT cards_type_check CHECK (type IN (
            'note','notebook','todo','task','bookmark','image','file','audio','gif',
            'sketch','mindmap_node','table','column','comment_anchor'
        ))");
    }
};
