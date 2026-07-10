<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Reminder extends Model
{
    use HasUuids;

    protected $fillable = ['card_id', 'remind_at', 'sent_at'];

    protected $casts = [
        'remind_at' => 'datetime',
        'sent_at'   => 'datetime',
    ];

    public function card(): BelongsTo
    {
        return $this->belongsTo(Card::class);
    }
}
