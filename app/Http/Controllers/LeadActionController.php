<?php

namespace App\Http\Controllers;

use App\Models\LeadActivity;
use App\Models\LeadSheet;
use App\Services\GoogleSheetService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeadActionController extends Controller
{
    protected GoogleSheetService $sheetService;

    public function __construct(GoogleSheetService $sheetService)
    {
        $this->sheetService = $sheetService;
    }

    public function livePoll(Request $request): JsonResponse
    {
        $user = $request->user();
        $team = $user->currentTeam;
        $sheetId = $request->query('sheet_id');

        $sheet = LeadSheet::where(function ($q) use ($user, $team) {
            $q->where('user_id', $user->id);
            if ($team) $q->orWhere('team_id', $team->id);
        })
        ->when($sheetId, fn($q) => $q->where('id', (int)$sheetId))
        ->when(!$sheetId, fn($q) => $q->where('is_active', true))
        ->first();

        if (!$sheet) {
            return response()->json([
                'success' => true,
                'sheet_id' => null,
                'leads' => [],
                'metrics' => [
                    'total' => 0,
                    'today' => 0,
                    'instagram' => 0,
                    'facebook' => 0,
                    'contacted' => 0,
                ],
                'synced_at' => now()->toIso8601String(),
            ]);
        }

        try {
            $result = $this->sheetService->getEnrichedLeads($sheet);
            $metrics = $this->calculateMetrics($result['leads']);

            return response()->json([
                'success' => true,
                'sheet_id' => $sheet->id,
                'leads' => $result['leads'],
                'metrics' => $metrics,
                'synced_at' => now()->toIso8601String(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    public function updateStatus(Request $request): JsonResponse
    {
        $request->validate([
            'sheet_id' => 'required|exists:lead_sheets,id',
            'lead_id' => 'required|string',
            'status' => 'required|string|max:50',
        ]);

        $sheet = $this->getAuthorizedSheet($request, (int)$request->input('sheet_id'));
        if (!$sheet) {
            return response()->json(['success' => false, 'error' => 'Unauthorized or sheet not found'], 403);
        }

        $activity = LeadActivity::firstOrNew([
            'lead_sheet_id' => $sheet->id,
            'lead_identifier' => $request->input('lead_id'),
        ]);

        $activity->status = strtoupper($request->input('status'));
        $activity->last_contacted_at = now();
        $activity->save();

        return response()->json([
            'success' => true,
            'status' => $activity->status,
            'lead_id' => $activity->lead_identifier,
        ]);
    }

    public function saveNotes(Request $request): JsonResponse
    {
        $request->validate([
            'sheet_id' => 'required|exists:lead_sheets,id',
            'lead_id' => 'required|string',
            'notes' => 'nullable|string|max:2000',
        ]);

        $sheet = $this->getAuthorizedSheet($request, (int)$request->input('sheet_id'));
        if (!$sheet) {
            return response()->json(['success' => false, 'error' => 'Unauthorized or sheet not found'], 403);
        }

        $activity = LeadActivity::firstOrNew([
            'lead_sheet_id' => $sheet->id,
            'lead_identifier' => $request->input('lead_id'),
        ]);

        $activity->notes = $request->input('notes');
        $activity->save();

        return response()->json([
            'success' => true,
            'notes' => $activity->notes,
            'lead_id' => $activity->lead_identifier,
        ]);
    }

    public function toggleStar(Request $request): JsonResponse
    {
        $request->validate([
            'sheet_id' => 'required|exists:lead_sheets,id',
            'lead_id' => 'required|string',
        ]);

        $sheet = $this->getAuthorizedSheet($request, (int)$request->input('sheet_id'));
        if (!$sheet) {
            return response()->json(['success' => false, 'error' => 'Unauthorized or sheet not found'], 403);
        }

        $activity = LeadActivity::firstOrNew([
            'lead_sheet_id' => $sheet->id,
            'lead_identifier' => $request->input('lead_id'),
        ]);

        $activity->starred = !$activity->starred;
        $activity->save();

        return response()->json([
            'success' => true,
            'starred' => $activity->starred,
            'lead_id' => $activity->lead_identifier,
        ]);
    }

    protected function getAuthorizedSheet(Request $request, int $sheetId): ?LeadSheet
    {
        $user = $request->user();
        $team = $user->currentTeam;

        return LeadSheet::where('id', $sheetId)
            ->where(function ($q) use ($user, $team) {
                $q->where('user_id', $user->id);
                if ($team) $q->orWhere('team_id', $team->id);
            })
            ->first();
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
