<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Connection extends Model
{
    use HasUuids;

    protected $fillable = ['board_id', 'from_card_id', 'to_card_id', 'kind', 'style'];

    protected $casts = [
        'style' => 'array',
    ];

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function fromCard(): BelongsTo
    {
        return $this->belongsTo(Card::class, 'from_card_id');
    }

    public function toCard(): BelongsTo
    {
        return $this->belongsTo(Card::class, 'to_card_id');
    }
}
