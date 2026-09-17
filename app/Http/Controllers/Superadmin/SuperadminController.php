<?php

namespace App\Http\Controllers\Superadmin;

use App\Http\Controllers\Controller;
use App\Models\LeadSheet;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Inertia\Inertia;
use Inertia\Response;

class SuperadminController extends Controller
{
    public function index(Request $request): Response
    {
        $users = User::with(['leadSheets', 'currentTeam', 'ownedTeams'])
            ->latest()
            ->get()
            ->map(function (User $user) {
                $sheets = $user->leadSheets;
                $totalLeads = (int) $sheets->sum('total_leads_count');
                $activeSheet = $sheets->firstWhere('is_active', true) ?: $sheets->first();
                $personalTeam = $user->personalTeam();

                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'email_verified' => $user->email_verified_at !== null,
                    'created_at' => $user->created_at?->toIso8601String(),
                    'created_formatted' => $user->created_at?->format('M d, Y · h:i A'),
                    'created_relative' => $user->created_at?->diffForHumans(),
                    'team_name' => $user->currentTeam?->name ?? 'Personal Workspace',
                    'team_slug' => $personalTeam?->slug ?? $user->currentTeam?->slug ?? 'workspace',
                    'sheets_count' => $sheets->count(),
                    'sheets' => $sheets->map(fn ($s) => [
                        'id' => $s->id,
                        'name' => $s->name,
                        'is_active' => (bool) $s->is_active,
                        'leads_count' => (int) $s->total_leads_count,
                    ])->values()->all(),
                    'active_sheet_name' => $activeSheet?->name,
                    'total_leads' => $totalLeads,
                ];
            });

        $totalSheets = LeadSheet::count();
        $totalLeads = (int) LeadSheet::sum('total_leads_count');

        $metrics = [
            'total_users' => $users->count(),
            'total_sheets' => $totalSheets,
            'total_leads' => $totalLeads,
        ];

        return Inertia::render('superadmin/index', [
            'users' => $users,
            'metrics' => $metrics,
            'flash' => [
                'success' => $request->session()->get('success'),
                'error' => $request->session()->get('error'),
            ],
        ]);
    }

    public function setPassword(Request $request, User $user): RedirectResponse
    {
        $request->validate([
            'password' => 'required|string|min:6|max:100',
        ]);

        $user->forceFill([
            'password' => Hash::make($request->input('password')),
        ])->save();

        return back()->with('success', "Password successfully updated for {$user->name} ({$user->email}).");
    }

    public function impersonate(Request $request, User $user): RedirectResponse
    {
        $request->session()->put('impersonated_by_superadmin', true);
        $request->session()->put('is_superadmin', true);

        Auth::login($user);

        $team = $user->personalTeam() ?? $user->currentTeam;
        $slug = $team?->slug ?? 'workspace';

        return redirect()->route('dashboard', ['current_team' => $slug])
            ->with('success', "Logged in as {$user->name}. You are now viewing their live leads dashboard.");
    }

    public function stopImpersonation(Request $request): RedirectResponse
    {
        Auth::logout();

        $request->session()->forget('impersonated_by_superadmin');
        $request->session()->put('is_superadmin', true);

        return redirect()->route('superadmin.index')
            ->with('success', 'Exited impersonation. Welcome back to Superadmin Portal.');
    }
}
