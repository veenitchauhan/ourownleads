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
        Schema::create('lead_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('lead_sheet_id')->constrained()->cascadeOnDelete();
            $table->string('lead_identifier');
            $table->string('status')->nullable();
            $table->text('notes')->nullable();
            $table->boolean('starred')->default(false);
            $table->timestamp('last_contacted_at')->nullable();
            $table->timestamps();

            $table->unique(['lead_sheet_id', 'lead_identifier']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lead_activities');
    }
};
