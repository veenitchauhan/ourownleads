<?php

namespace App\Services;

use App\Models\LeadActivity;
use App\Models\LeadSheet;
use Carbon\Carbon;
use Illuminate\Support\Facades\Http;

class GoogleSheetService
{
    /**
     * Parse Google Sheet ID and GID from URL or plain ID.
     */
    public function parseSheetUrl(string $url): array
    {
        $url = trim($url);
        $sheetId = null;
        $gid = '0';

        // Plain ID
        if (preg_match('/^[a-zA-Z0-9-_]{25,60}$/', $url)) {
            return [
                'sheet_id' => $url,
                'gid' => '0',
            ];
        }

        // Standard Google Sheet URL: /spreadsheets/d/{sheetId}
        if (preg_match('/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/', $url, $matches)) {
            $sheetId = $matches[1];
        }

        // GID from query parameter: ?gid=12345 or #gid=12345
        if (preg_match('/[?&#]gid=([0-9]+)/', $url, $matches)) {
            $gid = $matches[1];
        }

        return [
            'sheet_id' => $sheetId,
            'gid' => $gid,
        ];
    }

    /**
     * Build CSV export URLs with fallback options.
     */
    public function getCsvUrls(string $sheetId, string $gid = '0'): array
    {
        return [
            "https://docs.google.com/spreadsheets/d/{$sheetId}/gviz/tq?tqx=out:csv&gid={$gid}",
            "https://docs.google.com/spreadsheets/d/{$sheetId}/export?format=csv&gid={$gid}",
        ];
    }

    /**
     * Test connection to a sheet and return preview rows.
     */
    public function testConnection(string $url): array
    {
        $parsed = $this->parseSheetUrl($url);
        if (!$parsed['sheet_id']) {
            return [
                'success' => false,
                'error' => 'Invalid Google Sheet URL format. Please provide a valid docs.google.com/spreadsheets link.',
            ];
        }

        try {
            $leadsData = $this->fetchRawSheet($parsed['sheet_id'], $parsed['gid']);
            if (empty($leadsData['headers'])) {
                return [
                    'success' => false,
                    'error' => 'Could not find any headers or data in this sheet. Please ensure the sheet is set to "Anyone with the link can view".',
                ];
            }

            return [
                'success' => true,
                'sheet_id' => $parsed['sheet_id'],
                'gid' => $parsed['gid'],
                'total_rows' => count($leadsData['rows']),
                'headers' => $leadsData['headers'],
                'preview' => array_slice($leadsData['rows'], 0, 3),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to connect: ' . $e->getMessage() . '. Please verify the sheet is shared as "Anyone with the link can view".',
            ];
        }
    }

    /**
     * Fetch raw CSV content from Google Sheets.
     */
    public function fetchRawSheet(string $sheetId, string $gid = '0'): array
    {
        $urls = $this->getCsvUrls($sheetId, $gid);
        $csvContent = null;
        $lastError = null;

        foreach ($urls as $url) {
            try {
                $response = Http::withoutVerifying()
                    ->withHeaders([
                        'User-Agent' => 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
                    ])->timeout(12)->get($url);

                if ($response->successful() && !empty(trim($response->body()))) {
                    $body = $response->body();
                    if (!str_contains($body, '<!DOCTYPE html>') && !str_contains($body, '<html')) {
                        $csvContent = $body;
                        break;
                    }
                }
            } catch (\Exception $e) {
                $lastError = $e->getMessage();
            }
        }

        if (!$csvContent) {
            throw new \Exception($lastError ?? 'Sheet is not publicly accessible. In Google Sheets, click Share and set General Access to "Anyone with the link can view".');
        }

        return $this->parseCsvString($csvContent);
    }

    /**
     * Parse CSV string into associative array.
     */
    public function parseCsvString(string $csvContent): array
    {
        $lines = explode("\n", trim($csvContent));
        if (empty($lines)) {
            return ['headers' => [], 'rows' => []];
        }

        $stream = fopen('php://memory', 'r+');
        fwrite($stream, $csvContent);
        rewind($stream);

        $headers = [];
        $rows = [];
        $rowIndex = 0;

        while (($data = fgetcsv($stream, null, ',', '"', '\\')) !== false) {
            if (empty(array_filter($data, fn($val) => trim($val) !== ''))) {
                continue;
            }

            if (empty($headers)) {
                $headers = array_map(fn($h) => trim($h), $data);
                continue;
            }

            $row = [];
            foreach ($headers as $colIndex => $headerName) {
                if (empty($headerName)) {
                    $headerName = "column_" . ($colIndex + 1);
                }
                $row[$headerName] = isset($data[$colIndex]) ? trim($data[$colIndex]) : '';
            }

            $rows[] = $row;
            $rowIndex++;
        }

        fclose($stream);

        return [
            'headers' => $headers,
            'rows' => $rows,
        ];
    }

    /**
     * Fetch, normalize, and enrich leads for a LeadSheet model.
     */
    public function getEnrichedLeads(LeadSheet $sheet): array
    {
        $raw = $this->fetchRawSheet($sheet->sheet_id, $sheet->gid);
        $headers = $raw['headers'];
        $rows = $raw['rows'];

        // Load all local activities for this sheet
        $activities = LeadActivity::where('lead_sheet_id', $sheet->id)
            ->get()
            ->keyBy('lead_identifier');

        $leads = [];
        foreach ($rows as $index => $row) {
            $normalized = $this->normalizeLeadRow($row, $index);
            $identifier = $normalized['id'];

            if (isset($activities[$identifier])) {
                $act = $activities[$identifier];
                if (!empty($act->status)) {
                    $normalized['status'] = $act->status;
                }
                if (!empty($act->notes)) {
                    $normalized['local_notes'] = $act->notes;
                }
                $normalized['starred'] = (bool) $act->starred;
                $normalized['last_contacted_at'] = $act->last_contacted_at?->toIso8601String();
            } else {
                $normalized['starred'] = false;
                $normalized['local_notes'] = '';
                $normalized['last_contacted_at'] = null;
            }

            $leads[] = $normalized;
        }

        $totalCount = count($leads);
        if ($sheet->exists && $sheet->total_leads_count !== $totalCount) {
            $sheet->updateQuietly(['total_leads_count' => $totalCount]);
        }

        return [
            'leads' => $leads,
            'total' => $totalCount,
            'headers' => $headers,
        ];
    }

    /**
     * Normalize Meta Ads / generic lead columns into standard schema.
     */
    protected function normalizeLeadRow(array $row, int $rowIndex): array
    {
        $getVal = function (array $possibleKeys, $default = '') use ($row) {
            foreach ($possibleKeys as $key) {
                foreach ($row as $colName => $val) {
                    if (strcasecmp(trim($colName), trim($key)) === 0) {
                        return $val;
                    }
                    if (str_contains(strtolower($colName), strtolower($key))) {
                        return $val;
                    }
                }
            }
            return $default;
        };

        // Lead ID
        $id = $getVal(['id', 'lead_id', 'lead id'], 'lead_' . ($rowIndex + 1));
        if (empty($id)) {
            $id = 'lead_' . ($rowIndex + 1);
        }

        // Full Name
        $name = $getVal(['full_name', 'full name', 'name', 'client_name', 'lead_name', 'customer_name'], 'Unknown Lead');
        if (str_starts_with($name, '<test lead')) {
            $name = 'Meta Test Lead #' . substr($id, -4);
        }

        // Phone Number
        $rawPhone = $getVal(['phone_number', 'phone', 'mobile', 'contact_number', 'telephone'], '');
        $cleanedPhone = $this->cleanPhoneNumber($rawPhone);

        // Email
        $email = $getVal(['email', 'email_address', 'e-mail'], '');

        // City / Location
        $city = $getVal(['city', 'location', 'state', 'address'], '');
        if (str_starts_with($city, '<test lead')) {
            $city = 'Demo City';
        }

        // Platform
        $platform = strtolower($getVal(['platform', 'source'], 'meta'));
        if (str_contains($platform, 'ig') || str_contains($platform, 'instagram')) {
            $platform = 'Instagram';
        } elseif (str_contains($platform, 'fb') || str_contains($platform, 'facebook')) {
            $platform = 'Facebook';
        } else {
            $platform = ucfirst($platform ?: 'Meta');
        }

        // Created time
        $rawTime = $getVal(['created_time', 'created_at', 'date', 'timestamp', 'time'], '');
        $timeData = $this->formatTimestamp($rawTime);

        // Meta Ads details
        $campaign = $getVal(['campaign_name', 'campaign', 'campaign_id'], '');
        $adset = $getVal(['adset_name', 'adset'], '');
        $ad = $getVal(['ad_name', 'ad'], '');
        $form = $getVal(['form_name', 'form'], '');
        $inboxUrl = $getVal(['inbox_url', 'inbox', 'messenger'], '');
        if (str_starts_with($inboxUrl, '<test lead')) {
            $inboxUrl = '';
        }

        // Survey qualification questions
        $businessType = $getVal(['what_kind_of_business', 'business_type', 'business', 'industry'], '');
        if (str_starts_with($businessType, '<test lead')) {
            $businessType = 'Test Business';
        }
        $businessType = ucwords(str_replace(['_', '-'], ' ', $businessType));

        $problem = $getVal(['biggest_problem', 'problem', 'challenge', 'facing_right_now'], '');
        if (str_starts_with($problem, '<test lead')) {
            $problem = 'Looking to grow sales';
        }
        $problem = ucwords(str_replace(['_', '-'], ' ', $problem));

        $pastExperience = $getVal(['worked_with_a_marketing', 'experience', 'marketing_company', 'run_online_ads'], '');
        if (str_starts_with($pastExperience, '<test lead')) {
            $pastExperience = 'Ran ads before';
        }
        $pastExperience = ucwords(str_replace(['_', '-'], ' ', $pastExperience));

        $budget = $getVal(['monthly_budget', 'budget', 'investment'], '');
        if (str_starts_with($budget, '<test lead')) {
            $budget = '15,000 - 45,000';
        }
        $budget = str_replace(['_', '-'], ' ', $budget);

        // Status from sheet
        $sheetStatus = strtoupper($getVal(['lead_status', 'status'], 'NEW'));
        if (in_array($sheetStatus, ['CREAT', 'CREATED', 'NEW', ''])) {
            $sheetStatus = 'NEW';
        }

        // Sheet Notes
        $sheetNotes = '';
        foreach ($row as $k => $v) {
            if (str_starts_with(strtolower($k), 'column_') || strtolower($k) === 'notes' || strtolower($k) === 'remarks') {
                if (!empty($v) && !str_starts_with($v, '<test lead')) {
                    $sheetNotes = $v;
                    break;
                }
            }
        }

        // Extra details object for modal/drawer
        $extraDetails = [];
        foreach ($row as $col => $val) {
            if (!empty($val) && !str_starts_with($val, '<test lead')) {
                $cleanKey = ucwords(str_replace(['_', '-', '?'], ' ', preg_replace('/[?_]+$/', '', $col)));
                $extraDetails[$cleanKey] = $val;
            }
        }

        return [
            'id' => $id,
            'index' => $rowIndex + 1,
            'full_name' => $name,
            'phone_number' => $cleanedPhone['formatted'],
            'raw_phone' => $cleanedPhone['raw'],
            'whatsapp_url' => $cleanedPhone['whatsapp_url'],
            'tel_url' => $cleanedPhone['tel_url'],
            'email' => $email,
            'city' => $city,
            'platform' => $platform,
            'created_at' => $timeData['iso'],
            'created_display' => $timeData['display'],
            'created_relative' => $timeData['relative'],
            'campaign_name' => $campaign,
            'adset_name' => $adset,
            'ad_name' => $ad,
            'form_name' => $form,
            'inbox_url' => $inboxUrl,
            'business_type' => $businessType,
            'problem' => $problem,
            'past_experience' => $pastExperience,
            'budget' => $budget,
            'status' => $sheetStatus,
            'sheet_notes' => $sheetNotes,
            'raw_data' => $extraDetails,
        ];
    }

    /**
     * Clean and format phone number for WhatsApp and Tel calling.
     */
    protected function cleanPhoneNumber(string $raw): array
    {
        $raw = trim($raw);
        $cleaned = preg_replace('/^p:/i', '', $raw);
        $digits = preg_replace('/[^0-9+]/', '', $cleaned);

        if (empty($digits) || str_starts_with($digits, '<test')) {
            return [
                'raw' => $raw,
                'formatted' => 'Not provided',
                'whatsapp_url' => '',
                'tel_url' => '',
            ];
        }

        $numericOnly = preg_replace('/[^0-9]/', '', $digits);
        $whatsappDigits = $numericOnly;
        if (strlen($numericOnly) === 10) {
            $whatsappDigits = '91' . $numericOnly;
            $formatted = '+91 ' . substr($numericOnly, 0, 5) . ' ' . substr($numericOnly, 5);
        } elseif (strlen($numericOnly) === 12 && str_starts_with($numericOnly, '91')) {
            $formatted = '+91 ' . substr($numericOnly, 2, 5) . ' ' . substr($numericOnly, 7);
        } else {
            $formatted = $digits;
        }

        $encodedGreeting = urlencode("Hello! Reaching out regarding your inquiry on our ads.");

        return [
            'raw' => $raw,
            'formatted' => $formatted,
            'whatsapp_url' => "https://wa.me/{$whatsappDigits}?text={$encodedGreeting}",
            'tel_url' => "tel:+" . ltrim($whatsappDigits, '+'),
        ];
    }

    /**
     * Format timestamp into ISO, display, and human relative times.
     */
    protected function formatTimestamp(string $raw): array
    {
        if (empty($raw)) {
            return [
                'iso' => now()->toIso8601String(),
                'display' => 'Recent',
                'relative' => 'Just now',
            ];
        }

        try {
            $carbon = Carbon::parse($raw);
            return [
                'iso' => $carbon->toIso8601String(),
                'display' => $carbon->format('M d, Y · h:i A'),
                'relative' => $carbon->diffForHumans(),
            ];
        } catch (\Exception $e) {
            return [
                'iso' => now()->toIso8601String(),
                'display' => $raw,
                'relative' => $raw,
            ];
        }
    }
}
