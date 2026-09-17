<?php

use App\Models\LeadActivity;
use App\Models\LeadSheet;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('new authenticated user starts with 0 sheets and sees onboarding state', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('activeSheet', null)
        ->where('allSheets', [])
        ->where('leads', [])
        ->where('metrics.total', 0)
    );
});

test('authenticated user can poll live leads with no active sheet gracefully', function () {
    $user = User::factory()->create();

    $response = $this
        ->actingAs($user)
        ->getJson(route('leads.live'));

    $response->assertOk();
    $response->assertJson([
        'success' => true,
        'sheet_id' => null,
        'leads' => [],
    ]);
});

test('user A can create and view their own sheet', function () {
    $userA = User::factory()->create();
    $sheetA = LeadSheet::create([
        'user_id' => $userA->id,
        'name' => 'User A Campaign',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123456789012345678901234/edit',
        'sheet_id' => 'abc123456789012345678901234',
        'gid' => '0',
        'is_active' => true,
    ]);

    $response = $this
        ->actingAs($userA)
        ->get(route('dashboard'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('activeSheet.id', $sheetA->id)
        ->where('activeSheet.name', 'User A Campaign')
        ->has('allSheets', 1)
    );
});

test('user B cannot see or access user A sheet on dashboard', function () {
    $userA = User::factory()->create();
    $sheetA = LeadSheet::create([
        'user_id' => $userA->id,
        'name' => 'Secret Sheet A',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123456789012345678901234/edit',
        'sheet_id' => 'abc123456789012345678901234',
        'gid' => '0',
        'is_active' => true,
    ]);

    $userB = User::factory()->create();

    // User B visits dashboard with User A's sheet_id
    $response = $this
        ->actingAs($userB)
        ->get(route('dashboard', ['sheet_id' => $sheetA->id]));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('dashboard')
        ->where('activeSheet', null)
        ->where('allSheets', [])
    );
});

test('user B cannot update status, notes, or star on user A sheet', function () {
    $userA = User::factory()->create();
    $sheetA = LeadSheet::create([
        'user_id' => $userA->id,
        'name' => 'User A Sheet',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123456789012345678901234/edit',
        'sheet_id' => 'abc123456789012345678901234',
        'gid' => '0',
        'is_active' => true,
    ]);

    $userB = User::factory()->create();

    // Status update attempt by User B
    $statusRes = $this
        ->actingAs($userB)
        ->postJson(route('leads.status'), [
            'sheet_id' => $sheetA->id,
            'lead_id' => 'lead_001',
            'status' => 'CONVERTED',
        ]);
    $statusRes->assertStatus(403);

    // Notes attempt by User B
    $notesRes = $this
        ->actingAs($userB)
        ->postJson(route('leads.notes'), [
            'sheet_id' => $sheetA->id,
            'lead_id' => 'lead_001',
            'notes' => 'Tampered notes',
        ]);
    $notesRes->assertStatus(403);

    // Star attempt by User B
    $starRes = $this
        ->actingAs($userB)
        ->postJson(route('leads.star'), [
            'sheet_id' => $sheetA->id,
            'lead_id' => 'lead_001',
        ]);
    $starRes->assertStatus(403);

    // Assert no activities created on sheet A
    expect(LeadActivity::where('lead_sheet_id', $sheetA->id)->count())->toBe(0);
});

test('user B cannot activate or delete user A sheet', function () {
    $userA = User::factory()->create();
    $sheetA = LeadSheet::create([
        'user_id' => $userA->id,
        'name' => 'User A Sheet',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123456789012345678901234/edit',
        'sheet_id' => 'abc123456789012345678901234',
        'gid' => '0',
        'is_active' => true,
    ]);

    $userB = User::factory()->create();

    // Activate attempt by User B
    $activateRes = $this
        ->actingAs($userB)
        ->post(route('sheets.activate', $sheetA));
    $activateRes->assertStatus(403);

    // Delete attempt by User B
    $deleteRes = $this
        ->actingAs($userB)
        ->delete(route('sheets.destroy', $sheetA));
    $deleteRes->assertStatus(403);

    // Ensure sheet still exists
    expect(LeadSheet::find($sheetA->id))->not->toBeNull();
});

test('owner can update lead status and notes on their own sheet', function () {
    $user = User::factory()->create();
    $sheet = LeadSheet::create([
        'user_id' => $user->id,
        'name' => 'My Private Sheet',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/xyz123456789012345678901234/edit',
        'sheet_id' => 'xyz123456789012345678901234',
        'gid' => '0',
        'is_active' => true,
    ]);

    $statusRes = $this
        ->actingAs($user)
        ->postJson(route('leads.status'), [
            'sheet_id' => $sheet->id,
            'lead_id' => 'lead_owner_1',
            'status' => 'QUALIFIED',
        ]);
    $statusRes->assertOk();

    $notesRes = $this
        ->actingAs($user)
        ->postJson(route('leads.notes'), [
            'sheet_id' => $sheet->id,
            'lead_id' => 'lead_owner_1',
            'notes' => 'Owner notes here',
        ]);
    $notesRes->assertOk();

    $starRes = $this
        ->actingAs($user)
        ->postJson(route('leads.star'), [
            'sheet_id' => $sheet->id,
            'lead_id' => 'lead_owner_1',
        ]);
    $starRes->assertOk();

    $this->assertDatabaseHas('lead_activities', [
        'lead_sheet_id' => $sheet->id,
        'lead_identifier' => 'lead_owner_1',
        'status' => 'QUALIFIED',
        'notes' => 'Owner notes here',
        'starred' => true,
    ]);
});
