<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BoardDocument extends Model
{
    public $incrementing = false;
    public $timestamps   = false;

    protected $primaryKey = 'board_id';
    protected $keyType    = 'string';

    protected $fillable = ['board_id', 'state', 'updated_at'];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }
}
