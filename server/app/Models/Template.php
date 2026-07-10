<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Template extends Model
{
    use HasUuids;

    protected $fillable = ['scope', 'category', 'name', 'preview_url', 'doc'];

    protected $casts = [
        'doc' => 'array',
    ];
}
