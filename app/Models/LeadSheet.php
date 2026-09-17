<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LeadSheet extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'team_id',
        'name',
        'sheet_url',
        'sheet_id',
        'gid',
        'refresh_interval',
        'is_active',
        'column_mapping',
    ];

    protected $casts = [
        'column_mapping' => 'array',
        'is_active' => 'boolean',
        'refresh_interval' => 'integer',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function team(): BelongsTo
    {
        return $this->belongsTo(Team::class);
    }

    public function activities(): HasMany
    {
        return $this->hasMany(LeadActivity::class);
    }
}
