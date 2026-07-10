<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Database\Eloquent\SoftDeletes;

class Board extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    protected $fillable = [
        'user_id', 'title', 'description',
        'is_vault', 'vault_salt', 'vault_verifier', 'style',
    ];

    protected $casts = [
        'is_vault' => 'boolean',
        'style'    => 'array',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cards(): HasMany
    {
        return $this->hasMany(Card::class);
    }

    public function document(): HasOne
    {
        return $this->hasOne(BoardDocument::class);
    }

    public function members(): HasMany
    {
        return $this->hasMany(BoardMember::class);
    }

    /** Returns the requesting user's role, or null if not a member (and not owner). */
    public function memberRole(int $userId): ?string
    {
        if ($this->user_id === $userId) {
            return 'owner';
        }
        return $this->members()->where('user_id', $userId)->value('role');
    }
}
