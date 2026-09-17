<?php

use App\Http\Controllers\DashboardController;
use App\Http\Controllers\Teams\TeamInvitationController;
use App\Http\Middleware\EnsureTeamMembership;
use Illuminate\Support\Facades\Route;

Route::inertia('/', 'welcome')->name('home');

Route::get('dashboard', function () {
    return redirect()->route('dashboard');
})->middleware(['auth']);

Route::prefix('{current_team}')
    ->middleware(['auth', 'verified', EnsureTeamMembership::class])
    ->group(function () {
        Route::get('dashboard', DashboardController::class)->name('dashboard');
    });

Route::middleware(['auth'])->group(function () {
    Route::post('invitations/{invitation}/accept', [TeamInvitationController::class, 'accept'])->name('invitations.accept');
    Route::delete('invitations/{invitation}', [TeamInvitationController::class, 'decline'])->name('invitations.decline');

    // Live Leads & Polling API
    Route::get('api/live-leads', [\App\Http\Controllers\LeadActionController::class, 'livePoll'])->name('leads.live');

    // Google Sheets Management
    Route::post('sheets', [\App\Http\Controllers\SheetController::class, 'store'])->name('sheets.store');
    Route::post('sheets/test', [\App\Http\Controllers\SheetController::class, 'test'])->name('sheets.test');
    Route::post('sheets/{sheet}/activate', [\App\Http\Controllers\SheetController::class, 'setActive'])->name('sheets.activate');
    Route::delete('sheets/{sheet}', [\App\Http\Controllers\SheetController::class, 'destroy'])->name('sheets.destroy');

    // Lead Actions (Status, Notes, Star)
    Route::post('leads/status', [\App\Http\Controllers\LeadActionController::class, 'updateStatus'])->name('leads.status');
    Route::post('leads/notes', [\App\Http\Controllers\LeadActionController::class, 'saveNotes'])->name('leads.notes');
    Route::post('leads/star', [\App\Http\Controllers\LeadActionController::class, 'toggleStar'])->name('leads.star');
});

// Superadmin Portal Routes
Route::prefix('superadmin')->name('superadmin.')->group(function () {
    Route::get('login', [\App\Http\Controllers\Superadmin\SuperadminAuthController::class, 'showLogin'])->name('login');
    Route::post('login', [\App\Http\Controllers\Superadmin\SuperadminAuthController::class, 'login'])->name('login.store');
    Route::post('logout', [\App\Http\Controllers\Superadmin\SuperadminAuthController::class, 'logout'])->name('logout');

    Route::middleware([\App\Http\Middleware\EnsureSuperadmin::class])->group(function () {
        Route::get('/', [\App\Http\Controllers\Superadmin\SuperadminController::class, 'index'])->name('index');
        Route::post('sync-leads', [\App\Http\Controllers\Superadmin\SuperadminController::class, 'syncAllLeads'])->name('sync-leads');
        Route::post('users/{user}/password', [\App\Http\Controllers\Superadmin\SuperadminController::class, 'setPassword'])->name('users.password');
        Route::post('users/{user}/impersonate', [\App\Http\Controllers\Superadmin\SuperadminController::class, 'impersonate'])->name('users.impersonate');
    });

    Route::post('stop-impersonation', [\App\Http\Controllers\Superadmin\SuperadminController::class, 'stopImpersonation'])->name('stop-impersonation');
});

require __DIR__.'/settings.php';
