import React, { useState } from 'react';
import { 
    X, Phone, MessageCircle, Mail, ExternalLink, Star, Copy, Check, 
    Building2, Megaphone, DollarSign, FileText, Save, Clock, MapPin
} from 'lucide-react';
import axios from 'axios';

export interface Lead {
    id: string;
    index: number;
    full_name: string;
    phone_number: string;
    raw_phone: string;
    whatsapp_url: string;
    tel_url: string;
    email: string;
    city: string;
    platform: string;
    created_at: string;
    created_display: string;
    created_relative: string;
    campaign_name?: string;
    adset_name?: string;
    ad_name?: string;
    form_name?: string;
    inbox_url?: string;
    business_type?: string;
    problem?: string;
    past_experience?: string;
    budget?: string;
    status?: string;
    sheet_notes?: string;
    local_notes?: string;
    starred?: boolean;
    raw_data?: Record<string, string>;
}

interface LeadDetailModalProps {
    lead: Lead | null;
    sheetId?: number;
    isOpen: boolean;
    onClose: () => void;
    onUpdateLead?: (lead: Lead) => void;
}

export default function LeadDetailModal({
    lead,
    sheetId,
    isOpen,
    onClose,
    onUpdateLead,
}: LeadDetailModalProps) {
    if (!isOpen || !lead) return null;

    const [notes, setNotes] = useState(lead.local_notes || lead.sheet_notes || '');
    const [status, setStatus] = useState(lead.status || 'NEW');
    const [starred, setStarred] = useState(lead.starred || false);
    const [copied, setCopied] = useState(false);
    const [savingNotes, setSavingNotes] = useState(false);
    const [saveNotesSuccess, setSaveNotesSuccess] = useState(false);

    const handleCopyAll = () => {
        const text = `
Name: ${lead.full_name}
Phone: ${lead.phone_number}
Email: ${lead.email || 'N/A'}
City: ${lead.city || 'N/A'}
Platform: ${lead.platform}
Budget: ${lead.budget || 'N/A'}
Business: ${lead.business_type || 'N/A'}
Problem: ${lead.problem || 'N/A'}
Experience: ${lead.past_experience || 'N/A'}
Status: ${status}
Notes: ${notes}
        `.trim();
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleStatusChange = async (newStatus: string) => {
        setStatus(newStatus);
        if (!sheetId) return;
        try {
            await axios.post('/leads/status', {
                sheet_id: sheetId,
                lead_id: lead.id,
                status: newStatus,
            });
            onUpdateLead?.({ ...lead, status: newStatus });
        } catch (err) {
            console.error('Failed to update status', err);
        }
    };

    const handleToggleStar = async () => {
        const newStarred = !starred;
        setStarred(newStarred);
        if (!sheetId) return;
        try {
            await axios.post('/leads/star', {
                sheet_id: sheetId,
                lead_id: lead.id,
            });
            onUpdateLead?.({ ...lead, starred: newStarred });
        } catch (err) {
            console.error('Failed to toggle star', err);
        }
    };

    const handleSaveNotes = async () => {
        if (!sheetId) return;
        setSavingNotes(true);
        try {
            await axios.post('/leads/notes', {
                sheet_id: sheetId,
                lead_id: lead.id,
                notes: notes,
            });
            setSaveNotesSuccess(true);
            setTimeout(() => setSaveNotesSuccess(false), 2500);
            onUpdateLead?.({ ...lead, local_notes: notes });
        } catch (err) {
            console.error('Failed to save notes', err);
        } finally {
            setSavingNotes(false);
        }
    };

    const isInstagram = lead.platform?.toLowerCase().includes('instagram') || lead.platform?.toLowerCase() === 'ig';

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-2xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden max-h-[94vh] flex flex-col">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-border bg-muted/30 flex items-start justify-between">
                    <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                        <div className={`w-11 h-11 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center text-white font-black text-base sm:text-xl shadow-lg shrink-0 ${
                            isInstagram 
                                ? 'bg-linear-to-tr from-amber-500 via-rose-500 to-purple-600' 
                                : 'bg-blue-600'
                        }`}>
                            {lead.full_name?.charAt(0)?.toUpperCase() || 'L'}
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <h3 className="text-base sm:text-xl font-extrabold text-foreground truncate">{lead.full_name}</h3>
                                <button 
                                    onClick={handleToggleStar} 
                                    className={`transition p-1 rounded-md hover:bg-muted ${starred ? 'text-amber-400' : 'text-muted-foreground/40'}`}
                                    title={starred ? 'Starred Lead' : 'Star this lead'}
                                >
                                    <Star className={`w-4 h-4 ${starred ? 'fill-amber-400 text-amber-400' : ''}`} />
                                </button>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                                <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] ${
                                    isInstagram 
                                        ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                                        : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                }`}>
                                    {lead.platform}
                                </span>
                                {lead.city && (
                                    <span className="flex items-center gap-1 font-medium">
                                        <MapPin className="w-3 h-3 text-muted-foreground" />
                                        {lead.city}
                                    </span>
                                )}
                                <span className="hidden sm:inline">•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                    {lead.created_display || lead.created_relative}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        <button
                            onClick={handleCopyAll}
                            className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition flex items-center gap-1 text-xs font-medium"
                            title="Copy lead details"
                        >
                            {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
                        </button>
                        <button
                            onClick={onClose}
                            className="p-1.5 sm:p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content Body */}
                <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1 text-sm">
                    {/* Quick Contact Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-2.5">
                        {lead.whatsapp_url ? (
                            <a
                                href={lead.whatsapp_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-md transition"
                            >
                                <MessageCircle className="w-4 h-4" />
                                WhatsApp
                            </a>
                        ) : (
                            <div className="opacity-40 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed">
                                <MessageCircle className="w-4 h-4" /> WhatsApp
                            </div>
                        )}

                        {lead.tel_url ? (
                            <a
                                href={lead.tel_url}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition"
                            >
                                <Phone className="w-4 h-4" />
                                Call Direct
                            </a>
                        ) : (
                            <div className="opacity-40 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed">
                                <Phone className="w-4 h-4" /> Call
                            </div>
                        )}

                        {lead.email ? (
                            <a
                                href={`mailto:${lead.email}`}
                                className="flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border font-bold text-xs transition"
                            >
                                <Mail className="w-4 h-4" />
                                Email
                            </a>
                        ) : (
                            <div className="opacity-40 flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed">
                                <Mail className="w-4 h-4" /> Email
                            </div>
                        )}

                        {lead.inbox_url ? (
                            <a
                                href={lead.inbox_url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-foreground text-background font-bold text-xs shadow-md transition"
                            >
                                <ExternalLink className="w-3.5 h-3.5" />
                                Meta Inbox
                            </a>
                        ) : (
                            <div className="opacity-40 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl bg-muted text-muted-foreground text-xs font-semibold cursor-not-allowed">
                                <ExternalLink className="w-3.5 h-3.5" /> Meta Inbox
                            </div>
                        )}
                    </div>

                    {/* Status & Pipeline Stage */}
                    <div className="p-3.5 sm:p-4 rounded-xl bg-muted/40 border border-border space-y-2.5">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Lead Pipeline Status
                            </span>
                            <span className="text-[11px] font-bold text-primary">Current: {status}</span>
                        </div>
                        <div className="flex items-center flex-wrap gap-1.5">
                            {['NEW', 'CONTACTED', 'QUALIFIED', 'IN PROGRESS', 'CLOSED', 'LOST'].map((s) => (
                                <button
                                    key={s}
                                    type="button"
                                    onClick={() => handleStatusChange(s)}
                                    className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-bold transition ${
                                        status === s
                                            ? s === 'QUALIFIED' || s === 'CLOSED'
                                                ? 'bg-emerald-600 text-white shadow-xs'
                                                : s === 'LOST'
                                                ? 'bg-destructive text-destructive-foreground shadow-xs'
                                                : s === 'CONTACTED'
                                                ? 'bg-amber-500 text-white shadow-xs'
                                                : 'bg-primary text-primary-foreground shadow-xs'
                                            : 'bg-card text-foreground hover:bg-muted border border-border'
                                    }`}
                                >
                                    {s}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Lead Survey Qualification Answers */}
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2.5 flex items-center gap-1.5">
                            <Building2 className="w-4 h-4 text-primary" />
                            Survey & Qualification Details
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                            <div className="p-3 rounded-xl bg-card border border-border">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                                    Business Type
                                </span>
                                <p className="text-xs sm:text-sm font-bold text-foreground mt-0.5">
                                    {lead.business_type || 'Not specified'}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-card border border-border">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                                    Monthly Budget
                                </span>
                                <p className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 mt-0.5 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5" />
                                    {lead.budget ? `₹ ${lead.budget}` : 'Not specified'}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-card border border-border sm:col-span-2">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                                    Biggest Problem / Goal
                                </span>
                                <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                                    {lead.problem || 'Not specified'}
                                </p>
                            </div>

                            <div className="p-3 rounded-xl bg-card border border-border sm:col-span-2">
                                <span className="text-[10px] sm:text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                                    Worked with marketing agency before?
                                </span>
                                <p className="text-xs sm:text-sm font-semibold text-foreground mt-0.5">
                                    {lead.past_experience || 'Not specified'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Campaign Attribution */}
                    {(lead.campaign_name || lead.ad_name || lead.form_name) && (
                        <div>
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <Megaphone className="w-4 h-4 text-primary" />
                                Meta Ads Attribution
                            </h4>
                            <div className="p-3 sm:p-4 rounded-xl bg-muted/40 border border-border grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                                {lead.campaign_name && (
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Campaign</span>
                                        <span className="font-bold text-foreground">{lead.campaign_name}</span>
                                    </div>
                                )}
                                {lead.ad_name && (
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Ad Name</span>
                                        <span className="font-bold text-foreground">{lead.ad_name}</span>
                                    </div>
                                )}
                                {lead.adset_name && (
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Ad Set</span>
                                        <span className="font-bold text-foreground">{lead.adset_name}</span>
                                    </div>
                                )}
                                {lead.form_name && (
                                    <div>
                                        <span className="text-muted-foreground block text-[11px]">Instant Form</span>
                                        <span className="font-bold text-foreground">{lead.form_name}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Sales Notes & Remarks */}
                    <div>
                        <div className="flex items-center justify-between mb-1.5">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <FileText className="w-4 h-4 text-primary" />
                                Sales Rep Notes & Call Follow-up
                            </h4>
                            {saveNotesSuccess && (
                                <span className="text-xs font-bold text-emerald-500 flex items-center gap-1 animate-in fade-in">
                                    <Check className="w-3.5 h-3.5" /> Notes Saved!
                                </span>
                            )}
                        </div>
                        <textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Add call notes, customer requirements, follow-up date..."
                            className="w-full p-3 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-hidden transition shadow-2xs"
                        />
                        <div className="flex justify-end mt-2">
                            <button
                                type="button"
                                onClick={handleSaveNotes}
                                disabled={savingNotes}
                                className="px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xs rounded-xl shadow-xs transition flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Save className="w-3.5 h-3.5" />
                                {savingNotes ? 'Saving...' : 'Save Notes'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
