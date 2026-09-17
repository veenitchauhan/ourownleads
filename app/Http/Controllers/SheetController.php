<?php

namespace App\Http\Controllers;

use App\Models\LeadSheet;
use App\Services\GoogleSheetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class SheetController extends Controller
{
    protected GoogleSheetService $sheetService;

    public function __construct(GoogleSheetService $sheetService)
    {
        $this->sheetService = $sheetService;
    }

    public function test(Request $request): JsonResponse
    {
        $request->validate([
            'sheet_url' => 'required|string',
        ]);

        $result = $this->sheetService->testConnection($request->input('sheet_url'));
        return response()->json($result);
    }

    public function store(Request $request): RedirectResponse
    {
        $request->validate([
            'name' => 'required|string|max:100',
            'sheet_url' => 'required|string',
            'refresh_interval' => 'nullable|integer|min:5|max:300',
        ]);

        $user = $request->user();
        $team = $user->currentTeam;
        $test = $this->sheetService->testConnection($request->input('sheet_url'));

        if (!$test['success']) {
            return back()->withErrors(['sheet_url' => $test['error']]);
        }

        // Deactivate other sheets for this team/user
        LeadSheet::where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) $q->orWhere('team_id', $team->id);
        })->update(['is_active' => false]);

        $sheet = LeadSheet::create([
            'user_id' => $user->id,
            'team_id' => $team?->id,
            'name' => $request->input('name'),
            'sheet_url' => $request->input('sheet_url'),
            'sheet_id' => $test['sheet_id'],
            'gid' => $test['gid'] ?? '0',
            'refresh_interval' => $request->input('refresh_interval', 15),
            'is_active' => true,
        ]);

        $routeParams = ['sheet_id' => $sheet->id];
        if ($team) {
            $routeParams['current_team'] = $team->slug;
        }

        return redirect()->route('dashboard', $routeParams)
            ->with('success', 'Google Sheet connected successfully!');
    }

    public function setActive(Request $request, LeadSheet $sheet): RedirectResponse
    {
        if ($request->user()->cannot('update', $sheet)) {
            abort(403, 'Unauthorized to activate this sheet');
        }

        $user = $request->user();
        $team = $user->currentTeam;

        LeadSheet::where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) $q->orWhere('team_id', $team->id);
        })->update(['is_active' => false]);

        $sheet->update(['is_active' => true]);

        $routeParams = ['sheet_id' => $sheet->id];
        if ($team) {
            $routeParams['current_team'] = $team->slug;
        }

        return redirect()->route('dashboard', $routeParams);
    }

    public function destroy(Request $request, LeadSheet $sheet): RedirectResponse
    {
        if ($request->user()->cannot('delete', $sheet)) {
            abort(403, 'Unauthorized to delete this sheet');
        }

        $user = $request->user();
        $team = $user->currentTeam;

        \App\Models\LeadActivity::where('lead_sheet_id', $sheet->id)->delete();
        $sheet->delete();

        $remaining = LeadSheet::where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) $q->orWhere('team_id', $team->id);
        })->first();

        if ($remaining) {
            $remaining->update(['is_active' => true]);
            $routeParams = ['sheet_id' => $remaining->id];
            if ($team) $routeParams['current_team'] = $team->slug;
            return redirect()->route('dashboard', $routeParams);
        }

        $routeParams = [];
        if ($team) $routeParams['current_team'] = $team->slug;
        return redirect()->route('dashboard', $routeParams);
    }
}
