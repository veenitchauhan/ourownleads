<?php

use App\Models\LeadSheet;
use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Testing\AssertableInertia as Assert;

test('unauthenticated visitors are redirected to superadmin login', function () {
    $response = $this->get(route('superadmin.index'));
    $response->assertRedirect(route('superadmin.login'));
});

test('superadmin login page is accessible', function () {
    $response = $this->get(route('superadmin.login'));
    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/login')
    );
});

test('superadmin login fails with wrong password', function () {
    $response = $this->post(route('superadmin.login.store'), [
        'password' => 'wrong-password',
        'email' => 'superadmin@ourownleads.test',
    ]);

    $response->assertSessionHasErrors(['password']);
    $this->assertNull(session('is_superadmin'));
});

test('superadmin login succeeds with correct password from env', function () {
    $correctPassword = env('SUPERADMIN_PASSWORD', 'superadmin_secret_2026');

    $response = $this->post(route('superadmin.login.store'), [
        'password' => $correctPassword,
        'email' => env('SUPERADMIN_EMAIL', 'superadmin@ourownleads.test'),
    ]);

    $response->assertRedirect(route('superadmin.index'));
    $this->assertTrue(session('is_superadmin'));
});

test('authenticated superadmin can view users and metrics in portal', function () {
    $userA = User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com']);
    $userB = User::factory()->create(['name' => 'Jane Smith', 'email' => 'jane@example.com']);

    LeadSheet::create([
        'user_id' => $userA->id,
        'name' => 'John Meta Campaign',
        'sheet_url' => 'https://docs.google.com/spreadsheets/d/abc123456789012345678901234/edit',
        'sheet_id' => 'abc123456789012345678901234',
        'gid' => '0',
        'total_leads_count' => 12,
        'is_active' => true,
    ]);

    $response = $this
        ->withSession(['is_superadmin' => true])
        ->get(route('superadmin.index'));

    $response->assertOk();
    $response->assertInertia(fn (Assert $page) => $page
        ->component('superadmin/index')
        ->has('users')
        ->has('metrics')
        ->where('metrics.total_leads', 12)
    );
});

test('superadmin can set new password for any user', function () {
    $user = User::factory()->create([
        'password' => Hash::make('old-password-123'),
    ]);

    $response = $this
        ->withSession(['is_superadmin' => true])
        ->post(route('superadmin.users.password', $user), [
            'password' => 'new-secret-password-456',
        ]);

    $response->assertRedirect();
    $user->refresh();

    $this->assertTrue(Hash::check('new-secret-password-456', $user->password));
});

test('superadmin can impersonate user and exit back to portal', function () {
    $user = User::factory()->create(['name' => 'Alice Client']);

    // Impersonate
    $impersonateResponse = $this
        ->withSession(['is_superadmin' => true])
        ->post(route('superadmin.users.impersonate', $user));

    $impersonateResponse->assertRedirect();
    $this->assertEquals($user->id, Auth::id());
    $this->assertTrue(session('impersonated_by_superadmin'));

    // Stop Impersonation
    $stopResponse = $this->post(route('superadmin.stop-impersonation'));
    $stopResponse->assertRedirect(route('superadmin.index'));

    $this->assertNull(Auth::id());
    $this->assertTrue(session('is_superadmin'));
    $this->assertNull(session('impersonated_by_superadmin'));
});

test('superadmin can log out', function () {
    $response = $this
        ->withSession(['is_superadmin' => true])
        ->post(route('superadmin.logout'));

    $response->assertRedirect(route('superadmin.login'));
    $this->assertNull(session('is_superadmin'));
});
