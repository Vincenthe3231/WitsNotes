<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Card extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'board_id', 'created_by', 'type', 'title',
        'x', 'y', 'w', 'h', 'z', 'rotation',
        'style', 'content', 'content_text',
        'due_at', 'remind_at',
    ];

    protected $casts = [
        'x'        => 'float',
        'y'        => 'float',
        'w'        => 'float',
        'h'        => 'float',
        'z'        => 'integer',
        'rotation' => 'float',
        'style'    => 'array',
        'content'  => 'array',
        'due_at'   => 'datetime',
        'remind_at'=> 'datetime',
    ];

    protected static function booted(): void
    {
        // Soft-delete cascades: delete attachments so files are cleaned up
        static::deleting(function (Card $card) {
            $card->attachments->each->delete();
        });
    }

    public function board(): BelongsTo
    {
        return $this->belongsTo(Board::class);
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function attachments(): HasMany
    {
        return $this->hasMany(Attachment::class);
    }
}
