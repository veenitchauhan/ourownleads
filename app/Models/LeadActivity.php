<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeadActivity extends Model
{
    use HasFactory;

    protected $fillable = [
        'lead_sheet_id',
        'lead_identifier',
        'status',
        'notes',
        'starred',
        'last_contacted_at',
    ];

    protected $casts = [
        'starred' => 'boolean',
        'last_contacted_at' => 'datetime',
    ];

    public function sheet(): BelongsTo
    {
        return $this->belongsTo(LeadSheet::class, 'lead_sheet_id');
    }
}
