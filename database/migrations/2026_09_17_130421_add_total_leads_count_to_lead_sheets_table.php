<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('lead_sheets', function (Blueprint $table) {
            $table->unsignedInteger('total_leads_count')->default(0)->after('refresh_interval');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('lead_sheets', function (Blueprint $table) {
            $table->dropColumn('total_leads_count');
        });
    }
};
