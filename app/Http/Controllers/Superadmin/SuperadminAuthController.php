<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class SuperadminAuthController extends Controller
{
    public function showLogin(Request $request): Response|RedirectResponse
    {
        if ($request->session()->get('is_superadmin') === true) {
            return redirect()->route('superadmin.index');
        }

        return Inertia::render('superadmin/login', [
            'configuredEmail' => env('SUPERADMIN_EMAIL', 'superadmin@ourownleads.test'),
        ]);
    }

    public function login(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => 'required|string',
            'email' => 'nullable|string',
        ]);

        $configuredPassword = (string) env('SUPERADMIN_PASSWORD', 'superadmin_secret_2026');
        $configuredEmail = (string) env('SUPERADMIN_EMAIL', 'superadmin@ourownleads.test');

        $inputPassword = (string) $request->input('password');
        $inputEmail = (string) $request->input('email');

        $emailMatches = true;
        if (!empty($inputEmail) && !empty($configuredEmail)) {
            $emailMatches = strtolower(trim($inputEmail)) === strtolower(trim($configuredEmail));
        }

        if (hash_equals($configuredPassword, $inputPassword) && $emailMatches) {
            $request->session()->regenerate();
            $request->session()->put('is_superadmin', true);
            $request->session()->put('superadmin_logged_in_at', now()->toIso8601String());

            return redirect()->route('superadmin.index')
                ->with('success', 'Logged in to Superadmin Portal successfully.');
        }

        return back()->withErrors([
            'password' => 'Invalid superadmin password or credentials. Please verify your .env file configuration.',
        ]);
    }

    public function logout(Request $request): RedirectResponse
    {
        $request->session()->forget('is_superadmin');

        return redirect()->route('superadmin.login')
            ->with('info', 'Logged out from Superadmin Portal.');
    }
}
