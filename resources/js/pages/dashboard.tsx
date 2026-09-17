import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    RefreshCw, Plus, FileSpreadsheet, Search, Phone, MessageCircle, 
    ExternalLink, Star, Download, Volume2, VolumeX, AlertTriangle, 
    Users, Zap, MapPin, Eye, ChevronRight, Pause, Play, LayoutGrid, List, Building2,
    Sparkles, ArrowRight, ShieldCheck
} from 'lucide-react';
import axios from 'axios';
import AddSheetModal from '@/components/add-sheet-modal';
import ManageSheetsModal from '@/components/manage-sheets-modal';
import LeadDetailModal, { type Lead } from '@/components/lead-detail-modal';
import PendingInvitationsModal from '@/components/pending-invitations-modal';
import { dashboard } from '@/routes';
import type { DashboardInvitation } from '@/types';

// Audio chime using Web Audio API (Zero external file dependencies)
const playChimeSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.setValueAtTime(880, now + 0.1); // A5
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.start(now);
        osc.stop(now + 0.5);
    } catch (e) {}
};

interface SheetModel {
    id: number;
    name: string;
    sheet_url: string;
    refresh_interval: number;
    is_active: boolean;
}

interface Metrics {
    total?: number;
    today?: number;
    instagram?: number;
    facebook?: number;
    contacted?: number;
}

interface Props {
    pendingInvitations?: DashboardInvitation[];
    activeSheet?: SheetModel | null;
    allSheets?: SheetModel[];
    leads?: Lead[];
    metrics?: Metrics;
    fetchError?: string | null;
}

export default function Dashboard({
    pendingInvitations = [],
    activeSheet,
    allSheets = [],
    leads: initialLeads = [],
    metrics: initialMetrics = {},
    fetchError: initialError = null,
}: Props) {
    const [leads, setLeads] = useState<Lead[]>(initialLeads);
    const [metrics, setMetrics] = useState<Metrics>(initialMetrics);
    const [fetchError, setFetchError] = useState<string | null>(initialError);
    const [isSyncing, setIsSyncing] = useState(false);
    const [isAutoRefresh, setIsAutoRefresh] = useState(true);
    const [soundEnabled, setSoundEnabled] = useState(true);
    const refreshSecs = activeSheet?.refresh_interval || 15;
    const [countdown, setCountdown] = useState(refreshSecs);
    const [lastSynced, setLastSynced] = useState(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

    // View mode: 'auto', 'table', 'cards'
    const [viewMode, setViewMode] = useState<'auto' | 'table' | 'cards'>('auto');

    // Search & Filter State
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedPlatform, setSelectedPlatform] = useState('all');
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [sortBy, setSortBy] = useState<'newest' | 'oldest'>('newest');

    // Modals
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isManageModalOpen, setIsManageModalOpen] = useState(false);
    const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
    const [newLeadBanner, setNewLeadBanner] = useState<string | null>(null);
    const [showInvitations, setShowInvitations] = useState(pendingInvitations.length > 0);

    const knownLeadIdsRef = useRef(new Set(initialLeads.map(l => l.id)));

    // Sync function
    const triggerSync = async (isManual = false) => {
        if (!activeSheet) return;
        setIsSyncing(true);

        try {
            const response = await axios.get('/api/live-leads', {
                params: { sheet_id: activeSheet.id },
            });
            if (response.data.success) {
                const freshLeads: Lead[] = response.data.leads || [];
                const currentKnownIds = knownLeadIdsRef.current;
                const brandNewLeads = freshLeads.filter(l => !currentKnownIds.has(l.id));

                if (brandNewLeads.length > 0) {
                    if (soundEnabled) playChimeSound();
                    setNewLeadBanner(`${brandNewLeads.length} new lead${brandNewLeads.length > 1 ? 's' : ''} received!`);
                    setTimeout(() => setNewLeadBanner(null), 6000);
                    freshLeads.forEach(l => currentKnownIds.add(l.id));
                }

                setLeads(freshLeads);
                setMetrics(response.data.metrics || {});
                setFetchError(null);
                setLastSynced(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            }
        } catch (err: any) {
            console.error('Sync error:', err);
            if (isManual) {
                setFetchError(err.response?.data?.error || 'Failed to sync with Google Sheet.');
            }
        } finally {
            setIsSyncing(false);
            setCountdown(refreshSecs);
        }
    };

    // Auto-refresh timer
    useEffect(() => {
        if (!isAutoRefresh || !activeSheet) return;

        const timer = setInterval(() => {
            setCountdown(prev => {
                if (prev <= 1) {
                    triggerSync();
                    return refreshSecs;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [isAutoRefresh, activeSheet, refreshSecs, soundEnabled]);

    const handleUpdateLead = (updatedLead: Lead) => {
        setLeads(prev => prev.map(l => l.id === updatedLead.id ? updatedLead : l));
        if (selectedLead?.id === updatedLead.id) {
            setSelectedLead(updatedLead);
        }
    };

    const handleQuickStatusChange = async (leadId: string, newStatus: string) => {
        if (!activeSheet) return;
        try {
            await axios.post('/leads/status', {
                sheet_id: activeSheet.id,
                lead_id: leadId,
                status: newStatus,
            });
            setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const filteredLeads = useMemo(() => {
        return leads
            .filter(lead => {
                if (selectedPlatform !== 'all' && lead.platform?.toLowerCase() !== selectedPlatform.toLowerCase()) {
                    return false;
                }
                if (selectedStatus !== 'all' && (lead.status || 'NEW').toUpperCase() !== selectedStatus.toUpperCase()) {
                    return false;
                }
                if (searchQuery.trim()) {
                    const q = searchQuery.toLowerCase();
                    const matchName = lead.full_name?.toLowerCase().includes(q);
                    const matchPhone = lead.phone_number?.toLowerCase().includes(q);
                    const matchEmail = lead.email?.toLowerCase().includes(q);
                    const matchCity = lead.city?.toLowerCase().includes(q);
                    const matchBusiness = lead.business_type?.toLowerCase().includes(q);
                    const matchProblem = lead.problem?.toLowerCase().includes(q);
                    const matchNotes = (lead.local_notes || lead.sheet_notes)?.toLowerCase().includes(q);

                    if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchBusiness && !matchProblem && !matchNotes) {
                        return false;
                    }
                }
                return true;
            })
            .sort((a, b) => {
                if (sortBy === 'newest') {
                    return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
                } else {
                    return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
                }
            });
    }, [leads, selectedPlatform, selectedStatus, searchQuery, sortBy]);

    const handleExportCsv = () => {
        if (!filteredLeads.length) return;
        const headers = ['ID', 'Date', 'Name', 'Phone', 'Email', 'City', 'Platform', 'Business Type', 'Budget', 'Problem', 'Status', 'Notes'];
        const csvRows = [headers.join(',')];

        filteredLeads.forEach(l => {
            const row = [
                `"${l.id || ''}"`,
                `"${l.created_display || ''}"`,
                `"${(l.full_name || '').replace(/"/g, '""')}"`,
                `"${l.phone_number || ''}"`,
                `"${l.email || ''}"`,
                `"${l.city || ''}"`,
                `"${l.platform || ''}"`,
                `"${(l.business_type || '').replace(/"/g, '""')}"`,
                `"${l.budget || ''}"`,
                `"${(l.problem || '').replace(/"/g, '""')}"`,
                `"${l.status || 'NEW'}"`,
                `"${(l.local_notes || l.sheet_notes || '').replace(/"/g, '""')}"`,
            ];
            csvRows.push(row.join(','));
        });

        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `leads_${activeSheet?.name || 'export'}_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <>
            <Head title="Live Leads - OurOwnLeads" />

            <PendingInvitationsModal
                invitations={pendingInvitations}
                open={pendingInvitations.length > 0 && showInvitations}
                onOpenChange={setShowInvitations}
            />

            <div className="flex flex-col gap-4 p-3 sm:p-6 max-w-7xl mx-auto w-full">
                {/* Header Row */}
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-card p-4 rounded-2xl border border-border shadow-xs">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shrink-0">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-base sm:text-lg font-black text-foreground tracking-tight truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                                    {activeSheet ? activeSheet.name : 'No Sheet Connected'}
                                </h2>
                                {allSheets.length > 1 && (
                                    <button
                                        onClick={() => setIsManageModalOpen(true)}
                                        className="text-[10px] sm:text-xs text-primary font-bold px-2 py-0.5 rounded-md bg-primary/10 border border-primary/20 transition"
                                    >
                                        Switch ({allSheets.length})
                                    </button>
                                )}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                {activeSheet ? (
                                    <>
                                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                            Live Connected
                                        </span>
                                        <span>•</span>
                                        <span>Updated: {lastSynced}</span>
                                    </>
                                ) : (
                                    <span className="text-muted-foreground font-medium">
                                        No Google Sheet linked yet • Connect one to see live leads
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center flex-wrap gap-2 pt-1 lg:pt-0">
                        {activeSheet && (
                            <>
                                {/* Countdown */}
                                <div className="flex items-center gap-2 bg-muted/60 px-2.5 py-1.5 rounded-xl border border-border text-xs">
                                    <button
                                        onClick={() => setIsAutoRefresh(!isAutoRefresh)}
                                        className={`p-0.5 rounded-md transition ${isAutoRefresh ? 'text-primary' : 'text-muted-foreground'}`}
                                        title={isAutoRefresh ? 'Pause Auto-Refresh' : 'Resume Auto-Refresh'}
                                    >
                                        {isAutoRefresh ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                                    </button>
                                    <span className="text-muted-foreground font-semibold text-[11px] sm:text-xs">
                                        {isAutoRefresh ? `Sync in ${countdown}s` : 'Paused'}
                                    </span>
                                </div>

                                {/* Sync Now */}
                                <button
                                    onClick={() => triggerSync(true)}
                                    disabled={isSyncing}
                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold rounded-xl border border-border transition disabled:opacity-50"
                                >
                                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-primary' : ''}`} />
                                    <span className="hidden sm:inline">Sync</span>
                                </button>

                                {/* Sound Alert Toggle */}
                                <button
                                    onClick={() => {
                                        const next = !soundEnabled;
                                        setSoundEnabled(next);
                                        if (next) playChimeSound();
                                    }}
                                    className={`p-2 rounded-xl border transition ${
                                        soundEnabled 
                                            ? 'bg-primary/10 border-primary/30 text-primary' 
                                            : 'bg-card border-border text-muted-foreground'
                                    }`}
                                    title={soundEnabled ? 'Lead Chime Alerts Enabled' : 'Lead Chime Alerts Muted'}
                                >
                                    {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
                                </button>
                            </>
                        )}

                        {/* Connect Sheet Button */}
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md transition shrink-0"
                        >
                            <Plus className="w-4 h-4" />
                            <span>{activeSheet ? 'Add Sheet' : 'Connect Google Sheet'}</span>
                        </button>
                    </div>
                </div>

                {/* Banner on new lead */}
                {newLeadBanner && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-600 text-white shadow-xl flex items-center justify-between animate-in slide-in-from-top-4 duration-300">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                                <Zap className="w-4 h-4 animate-bounce" />
                            </div>
                            <div>
                                <p className="font-extrabold text-xs sm:text-sm">{newLeadBanner}</p>
                                <p className="text-[11px] text-emerald-100 hidden sm:block">Click any contact button to start conversations instantly.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setNewLeadBanner(null)}
                            className="text-white/80 hover:text-white text-xs font-bold px-2 py-1 bg-white/10 rounded-lg"
                        >
                            Dismiss
                        </button>
                    </div>
                )}

                {/* Fetch Error Banner */}
                {fetchError && (
                    <div className="p-3.5 sm:p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-3">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="font-bold text-sm">Sheet Sync Warning</p>
                            <p className="mt-0.5 text-destructive/80">{fetchError}</p>
                        </div>
                        <button
                            onClick={() => triggerSync(true)}
                            className="px-3 py-1 bg-destructive text-destructive-foreground font-bold rounded-lg transition"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {!activeSheet ? (
                    /* SaaS Onboarding Hero State */
                    <div className="bg-card border border-border rounded-3xl p-6 sm:p-12 shadow-xs text-center max-w-3xl mx-auto my-6 w-full">
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold mb-5">
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>SaaS Live Lead Engine</span>
                        </div>

                        <h3 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            Connect Your Google Sheet
                        </h3>
                        <p className="text-xs sm:text-sm text-muted-foreground mt-2.5 max-w-lg mx-auto leading-relaxed">
                            Turn your Meta Ads spreadsheet into an instant, real-time sales cockpit. Each user only sees leads from sheets they connect.
                        </p>

                        {/* 3 Step Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 my-8 text-left">
                            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                                <div>
                                    <div className="w-7 h-7 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold text-xs mb-3">
                                        1
                                    </div>
                                    <h4 className="font-bold text-xs sm:text-sm text-foreground">Prepare Your Sheet</h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-normal">
                                        Open any Google Sheet containing your Meta Ads or inquiry leads.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                                <div>
                                    <div className="w-7 h-7 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs mb-3">
                                        2
                                    </div>
                                    <h4 className="font-bold text-xs sm:text-sm text-foreground">Enable View Access</h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-normal">
                                        In Google Sheets, click <b>Share</b> and set General Access to <i>"Anyone with the link can view"</i>.
                                    </p>
                                </div>
                            </div>

                            <div className="p-4 rounded-2xl bg-muted/40 border border-border/80 flex flex-col justify-between">
                                <div>
                                    <div className="w-7 h-7 rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs mb-3">
                                        3
                                    </div>
                                    <h4 className="font-bold text-xs sm:text-sm text-foreground">Paste & Launch</h4>
                                    <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 leading-normal">
                                        Paste the link to start live 15s auto-polling, 1-tap WhatsApp, and status tracking.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* CTA */}
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs sm:text-sm rounded-xl shadow-md hover:shadow-lg transition cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                <span>Connect Your Google Sheet</span>
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center justify-center flex-wrap gap-4 sm:gap-6 mt-8 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                                <span>100% Private to your account</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Zap className="w-4 h-4 text-amber-500" />
                                <span>Real-time background polling</span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* KPI Metrics Ribbon */}
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
                    <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Total Leads</span>
                            <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                                <Users className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-foreground">{metrics.total || leads.length}</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-medium">Live captured</p>
                    </div>

                    <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Today / 24h</span>
                            <div className="w-7 h-7 rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                <Zap className="w-3.5 h-3.5" />
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">{metrics.today || 0}</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-medium">Fresh inbound</p>
                    </div>

                    <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Instagram</span>
                            <div className="w-7 h-7 rounded-lg bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600 text-white flex items-center justify-center">
                                <span className="font-bold text-[10px]">IG</span>
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-foreground">{metrics.instagram || 0}</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-medium">Instagram forms</p>
                    </div>

                    <div className="bg-card p-3.5 sm:p-4 rounded-2xl border border-border shadow-xs">
                        <div className="flex items-center justify-between text-muted-foreground mb-1">
                            <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider">Facebook</span>
                            <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                                <span className="font-bold text-[10px]">FB</span>
                            </div>
                        </div>
                        <div className="text-xl sm:text-2xl font-black text-foreground">{metrics.facebook || 0}</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 font-medium">Facebook leads</p>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="bg-card p-3 sm:p-4 rounded-2xl border border-border shadow-xs space-y-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, phone, city, problem, notes..."
                            className="w-full pl-9.5 pr-4 py-2 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-hidden transition"
                        />
                    </div>

                    <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                        <div className="flex items-center flex-wrap gap-2">
                            {/* Platform Filter */}
                            <div className="flex items-center bg-muted p-0.5 rounded-xl">
                                {['all', 'Instagram', 'Facebook'].map(p => (
                                    <button
                                        key={p}
                                        onClick={() => setSelectedPlatform(p)}
                                        className={`px-2.5 py-1 rounded-lg font-bold capitalize transition text-[11px] sm:text-xs ${
                                            selectedPlatform === p 
                                                ? 'bg-card text-foreground shadow-xs' 
                                                : 'text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>

                            {/* Status Filter */}
                            <select
                                value={selectedStatus}
                                onChange={(e) => setSelectedStatus(e.target.value)}
                                className="py-1 px-2.5 rounded-xl border border-input bg-background text-foreground text-[11px] sm:text-xs font-medium focus:ring-2 focus:ring-primary outline-hidden"
                            >
                                <option value="all">All Status</option>
                                <option value="NEW">New</option>
                                <option value="CONTACTED">Contacted</option>
                                <option value="QUALIFIED">Qualified</option>
                                <option value="IN PROGRESS">In Progress</option>
                                <option value="CLOSED">Closed Won</option>
                                <option value="LOST">Lost</option>
                            </select>

                            {/* Sort */}
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest')}
                                className="py-1 px-2.5 rounded-xl border border-input bg-background text-foreground text-[11px] sm:text-xs font-medium focus:ring-2 focus:ring-primary outline-hidden hidden sm:inline-block"
                            >
                                <option value="newest">Newest First</option>
                                <option value="oldest">Oldest First</option>
                            </select>
                        </div>

                        {/* Right Actions */}
                        <div className="flex items-center gap-1.5 ml-auto">
                            {/* Desktop View Switcher */}
                            <div className="hidden md:flex items-center bg-muted p-0.5 rounded-xl">
                                <button
                                    onClick={() => setViewMode('table')}
                                    className={`p-1.5 rounded-lg transition ${
                                        viewMode === 'table' || viewMode === 'auto'
                                            ? 'bg-card text-foreground shadow-xs' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Table View"
                                >
                                    <List className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => setViewMode('cards')}
                                    className={`p-1.5 rounded-lg transition ${
                                        viewMode === 'cards' 
                                            ? 'bg-card text-foreground shadow-xs' 
                                            : 'text-muted-foreground hover:text-foreground'
                                    }`}
                                    title="Card Grid View"
                                >
                                    <LayoutGrid className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Export CSV */}
                            <button
                                onClick={handleExportCsv}
                                className="flex items-center gap-1 px-2.5 py-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground font-bold rounded-xl border border-border transition text-[11px] sm:text-xs"
                                title="Export Filtered Leads to CSV"
                            >
                                <Download className="w-3.5 h-3.5" />
                                <span>Export</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Subheading */}
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-bold text-foreground">
                        Live Leads ({filteredLeads.length})
                    </h3>
                    <span className="text-[11px] text-muted-foreground">
                        Click lead row to open qualification details & rep notes
                    </span>
                </div>

                {filteredLeads.length === 0 ? (
                    <div className="bg-card rounded-2xl border border-border p-8 sm:p-12 text-center shadow-xs">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
                            <Users className="w-6 h-6" />
                        </div>
                        <h4 className="text-sm font-bold text-foreground">No leads match your criteria</h4>
                        <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                            Try adjusting your filters or wait for new leads to enter the Google Sheet.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* ========================================================= */}
                        {/* MOBILE CARDS VIEW (Always shown on mobile, or in cards mode) */}
                        {/* ========================================================= */}
                        <div className={`space-y-3 ${viewMode === 'cards' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 space-y-0' : 'block md:hidden'}`}>
                            {filteredLeads.map((lead) => {
                                const isIg = lead.platform?.toLowerCase().includes('instagram') || lead.platform?.toLowerCase() === 'ig';
                                return (
                                    <div
                                        key={lead.id}
                                        onClick={() => setSelectedLead(lead)}
                                        className="bg-card rounded-2xl border border-border p-4 shadow-xs hover:shadow-md transition active:scale-[0.99] space-y-3 cursor-pointer relative overflow-hidden group"
                                    >
                                        <div className={`absolute top-0 left-0 right-0 h-1 ${
                                            isIg 
                                                ? 'bg-linear-to-r from-amber-500 via-rose-500 to-purple-600' 
                                                : 'bg-blue-600'
                                        }`} />

                                        {/* Row 1 */}
                                        <div className="flex items-start justify-between gap-3 pt-1">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs ${
                                                    isIg 
                                                        ? 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600' 
                                                        : 'bg-blue-600'
                                                }`}>
                                                    {lead.full_name?.charAt(0)?.toUpperCase() || 'L'}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5">
                                                        <h4 className="font-extrabold text-foreground text-sm truncate group-hover:text-primary transition">
                                                            {lead.full_name}
                                                        </h4>
                                                        {lead.starred && (
                                                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                                                        <span className="font-mono font-semibold">{lead.phone_number}</span>
                                                        {lead.city && (
                                                            <>
                                                                <span>•</span>
                                                                <span className="flex items-center gap-0.5 truncate font-medium">
                                                                    <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
                                                                    {lead.city}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-end gap-1 shrink-0">
                                                <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                                    isIg 
                                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                                                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                }`}>
                                                    {lead.platform}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground font-medium">
                                                    {lead.created_relative}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Survey Highlights */}
                                        <div className="bg-muted/50 rounded-xl p-3 border border-border text-xs space-y-1.5">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="font-semibold truncate flex items-center gap-1">
                                                    <Building2 className="w-3.5 h-3.5 text-primary shrink-0" />
                                                    {lead.business_type || 'General'}
                                                </span>
                                                {lead.budget && (
                                                    <span className="px-2 py-0.5 rounded-md text-[11px] font-extrabold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                                        ₹ {lead.budget}
                                                    </span>
                                                )}
                                            </div>
                                            {lead.problem && (
                                                <p className="text-[11px] text-muted-foreground line-clamp-2">
                                                    <span className="font-bold text-foreground">Problem:</span> {lead.problem}
                                                </p>
                                            )}
                                            {(lead.local_notes || lead.sheet_notes) && (
                                                <div className="pt-1 border-t border-border text-[11px] font-medium flex items-start gap-1">
                                                    <span className="text-primary font-bold shrink-0">Note:</span>
                                                    <span className="line-clamp-1 italic text-muted-foreground">{lead.local_notes || lead.sheet_notes}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action Buttons */}
                                        <div className="pt-1 flex items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                                            <select
                                                value={lead.status || 'NEW'}
                                                onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                                                className="text-[11px] font-extrabold py-1.5 px-2.5 rounded-xl border border-input bg-background text-foreground cursor-pointer"
                                            >
                                                <option value="NEW">NEW</option>
                                                <option value="CONTACTED">CONTACTED</option>
                                                <option value="QUALIFIED">QUALIFIED</option>
                                                <option value="IN PROGRESS">IN PROGRESS</option>
                                                <option value="CLOSED">CLOSED WON</option>
                                                <option value="LOST">LOST</option>
                                            </select>

                                            <div className="flex items-center gap-1.5">
                                                {lead.whatsapp_url && (
                                                    <a
                                                        href={lead.whatsapp_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition"
                                                        title="WhatsApp Lead"
                                                    >
                                                        <MessageCircle className="w-3.5 h-3.5" />
                                                        <span>Chat</span>
                                                    </a>
                                                )}
                                                {lead.tel_url && (
                                                    <a
                                                        href={lead.tel_url}
                                                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition"
                                                        title="Call Lead"
                                                    >
                                                        <Phone className="w-3.5 h-3.5" />
                                                        <span>Call</span>
                                                    </a>
                                                )}
                                                {lead.inbox_url && (
                                                    <a
                                                        href={lead.inbox_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-1.5 rounded-xl bg-foreground text-background transition"
                                                        title="Open Meta Inbox"
                                                    >
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => setSelectedLead(lead)}
                                                    className="p-1.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition"
                                                    title="View Full Profile"
                                                >
                                                    <ChevronRight className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* ========================================================= */}
                        {/* DESKTOP TABLE VIEW */}
                        {/* ========================================================= */}
                        <div className={`bg-card rounded-2xl border border-border shadow-xs overflow-hidden ${
                            viewMode === 'cards' ? 'hidden' : 'hidden md:block'
                        }`}>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-muted/40 text-muted-foreground font-semibold border-b border-border uppercase tracking-wider text-[11px]">
                                        <tr>
                                            <th className="py-3 px-4">Lead Contact</th>
                                            <th className="py-3 px-4">Platform & Time</th>
                                            <th className="py-3 px-4">Survey & Budget</th>
                                            <th className="py-3 px-4">Status</th>
                                            <th className="py-3 px-4">Quick Actions</th>
                                            <th className="py-3 px-4 text-right">Details</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {filteredLeads.map((lead) => {
                                            const isIg = lead.platform?.toLowerCase().includes('instagram') || lead.platform?.toLowerCase() === 'ig';
                                            return (
                                                <tr 
                                                    key={lead.id} 
                                                    className="hover:bg-muted/30 transition group cursor-pointer"
                                                    onClick={() => setSelectedLead(lead)}
                                                >
                                                    <td className="py-3.5 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                                                                isIg 
                                                                    ? 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600' 
                                                                    : 'bg-blue-600'
                                                            }`}>
                                                                {lead.full_name?.charAt(0)?.toUpperCase() || 'L'}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="font-bold text-foreground group-hover:text-primary transition truncate">
                                                                        {lead.full_name}
                                                                    </span>
                                                                    {lead.starred && (
                                                                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 shrink-0" />
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-muted-foreground text-[11px] mt-0.5">
                                                                    <span className="font-mono font-medium">{lead.phone_number}</span>
                                                                    {lead.city && (
                                                                        <>
                                                                            <span>•</span>
                                                                            <span className="font-medium">{lead.city}</span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 whitespace-nowrap">
                                                        <div className="space-y-1">
                                                            <span className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded-md text-[10px] ${
                                                                isIg 
                                                                    ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                                                                    : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                            }`}>
                                                                {lead.platform}
                                                            </span>
                                                            <div className="text-[11px] text-muted-foreground">
                                                                {lead.created_relative}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 max-w-xs">
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-semibold text-foreground truncate">
                                                                    {lead.business_type || 'General'}
                                                                </span>
                                                                {lead.budget && (
                                                                    <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 shrink-0">
                                                                        ₹ {lead.budget}
                                                                    </span>
                                                                )}
                                                            </div>
                                                            <div className="text-[11px] text-muted-foreground truncate" title={lead.problem}>
                                                                {lead.problem || 'Looking for business growth'}
                                                            </div>
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                        <select
                                                            value={lead.status || 'NEW'}
                                                            onChange={(e) => handleQuickStatusChange(lead.id, e.target.value)}
                                                            className="text-[11px] font-bold py-1 px-2.5 rounded-lg border border-input bg-background text-foreground cursor-pointer"
                                                        >
                                                            <option value="NEW">NEW</option>
                                                            <option value="CONTACTED">CONTACTED</option>
                                                            <option value="QUALIFIED">QUALIFIED</option>
                                                            <option value="IN PROGRESS">IN PROGRESS</option>
                                                            <option value="CLOSED">CLOSED WON</option>
                                                            <option value="LOST">LOST</option>
                                                        </select>
                                                    </td>

                                                    <td className="py-3.5 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center gap-1.5">
                                                            {lead.whatsapp_url && (
                                                                <a
                                                                    href={lead.whatsapp_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500 hover:text-white border border-emerald-500/30 transition"
                                                                    title="1-Click WhatsApp Chat"
                                                                >
                                                                    <MessageCircle className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                            {lead.tel_url && (
                                                                <a
                                                                    href={lead.tel_url}
                                                                    className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-500/30 transition"
                                                                    title="1-Click Call"
                                                                >
                                                                    <Phone className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                            {lead.inbox_url && (
                                                                <a
                                                                    href={lead.inbox_url}
                                                                    target="_blank"
                                                                    rel="noreferrer"
                                                                    className="p-1.5 rounded-lg bg-muted text-foreground hover:bg-foreground hover:text-background border border-border transition"
                                                                    title="Open Meta Inbox"
                                                                >
                                                                    <ExternalLink className="w-4 h-4" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </td>

                                                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                                        <button
                                                            onClick={() => setSelectedLead(lead)}
                                                            className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary font-semibold transition"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                            <ChevronRight className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>
                )}
                    </>
                )}
            </div>

            {/* Modals */}
            <AddSheetModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
            />

            <ManageSheetsModal
                sheets={allSheets}
                activeSheetId={activeSheet?.id}
                isOpen={isManageModalOpen}
                onClose={() => setIsManageModalOpen(false)}
                onOpenAddModal={() => setIsAddModalOpen(true)}
            />

            <LeadDetailModal
                lead={selectedLead}
                sheetId={activeSheet?.id}
                isOpen={!!selectedLead}
                onClose={() => setSelectedLead(null)}
                onUpdateLead={handleUpdateLead}
            />
        </>
    );
}

Dashboard.layout = (props: { currentTeam?: { slug: string } | null }) => ({
    breadcrumbs: [
        {
            title: 'Dashboard',
            href: props.currentTeam ? dashboard(props.currentTeam.slug) : '/',
        },
    ],
});
