<?php

namespace App\Http\Controllers;

use App\Models\LeadSheet;
use App\Models\TeamInvitation;
use App\Services\GoogleSheetService;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class DashboardController extends Controller
{
    protected GoogleSheetService $sheetService;

    public function __construct(GoogleSheetService $sheetService)
    {
        $this->sheetService = $sheetService;
    }

    public function __invoke(Request $request): Response
    {
        $user = $request->user();
        $team = $user->currentTeam;
        $email = strtolower($user->email);

        // Fetch team invitations (default starter kit feature)
        $pendingInvitations = TeamInvitation::query()
            ->with(['inviter', 'team'])
            ->whereRaw('LOWER(email) = ?', [$email])
            ->whereNull('accepted_at')
            ->where(fn ($query) => $query
                ->whereNull('expires_at')
                ->orWhere('expires_at', '>=', now()))
            ->latest()
            ->get()
            ->map(fn (TeamInvitation $invitation) => [
                'code' => $invitation->code,
                'inviterName' => $invitation->inviter->name,
                'team' => [
                    'name' => $invitation->team->name,
                    'slug' => $invitation->team->slug,
                ],
            ]);

        // Query sheets for this user or current team
        $sheetQuery = LeadSheet::query()->where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) {
                $q->orWhere('team_id', $team->id);
            }
        });

        $allSheets = LeadSheet::query()->where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) {
                $q->orWhere('team_id', $team->id);
            }
        })->latest()->get();

        $activeSheetId = $request->query('sheet_id');
        $activeSheet = null;

        if ($activeSheetId) {
            $activeSheet = $allSheets->firstWhere('id', (int)$activeSheetId);
        }

        if (!$activeSheet) {
            $activeSheet = $allSheets->firstWhere('is_active', true) ?: $allSheets->first();
        }

        $leads = [];
        $metrics = [
            'total' => 0,
            'today' => 0,
            'instagram' => 0,
            'facebook' => 0,
            'contacted' => 0,
        ];
        $fetchError = null;

        if ($activeSheet) {
            try {
                $result = $this->sheetService->getEnrichedLeads($activeSheet);
                $leads = $result['leads'];
                $metrics = $this->calculateMetrics($leads);
            } catch (\Exception $e) {
                $fetchError = $e->getMessage();
            }
        }

        return Inertia::render('dashboard', [
            'pendingInvitations' => $pendingInvitations,
            'activeSheet' => $activeSheet,
            'allSheets' => $allSheets,
            'leads' => $leads,
            'metrics' => $metrics,
            'fetchError' => $fetchError,
        ]);
    }

    protected function calculateMetrics(array $leads): array
    {
        $today = Carbon::today();
        $total = count($leads);
        $todayCount = 0;
        $igCount = 0;
        $fbCount = 0;
        $contactedCount = 0;

        foreach ($leads as $lead) {
            try {
                $created = Carbon::parse($lead['created_at']);
                if ($created->isSameDay($today) || $created->diffInHours(now()) <= 24) {
                    $todayCount++;
                }
            } catch (\Exception $e) {}

            $platform = strtolower($lead['platform'] ?? '');
            if (str_contains($platform, 'instagram') || str_contains($platform, 'ig')) {
                $igCount++;
            } elseif (str_contains($platform, 'facebook') || str_contains($platform, 'fb')) {
                $fbCount++;
            }

            $status = strtoupper($lead['status'] ?? '');
            if (in_array($status, ['CONTACTED', 'CALLED', 'QUALIFIED', 'IN PROGRESS', 'CLOSED'])) {
                $contactedCount++;
            }
        }

        return [
            'total' => $total,
            'today' => $todayCount,
            'instagram' => $igCount,
            'facebook' => $fbCount,
            'contacted' => $contactedCount,
        ];
    }
}
