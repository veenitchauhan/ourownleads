import React, { useState } from 'react';
import { useForm } from '@inertiajs/react';
import { FileSpreadsheet, Link2, AlertCircle, CheckCircle2, Loader2, X, HelpCircle } from 'lucide-react';
import axios from 'axios';

interface AddSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AddSheetModal({ isOpen, onClose }: AddSheetModalProps) {
    if (!isOpen) return null;

    const { data, setData, post, processing, errors, reset } = useForm({
        name: 'Meta Ads Leads',
        sheet_url: '',
        refresh_interval: 15,
    });

    const [testing, setTesting] = useState(false);
    const [testResult, setTestResult] = useState<{ total_rows: number; headers: string[] } | null>(null);
    const [testError, setTestError] = useState<string | null>(null);

    const handleTest = async () => {
        if (!data.sheet_url) {
            setTestError('Please paste a Google Sheet URL first.');
            return;
        }

        setTesting(true);
        setTestResult(null);
        setTestError(null);

        try {
            const response = await axios.post('/sheets/test', {
                sheet_url: data.sheet_url,
            });

            if (response.data.success) {
                setTestResult(response.data);
            } else {
                setTestError(response.data.error || 'Could not access sheet.');
            }
        } catch (err: any) {
            setTestError(err.response?.data?.message || 'Failed to connect to sheet. Please ensure it is shared publicly.');
        } finally {
            setTesting(false);
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/sheets', {
            onSuccess: () => {
                reset();
                setTestResult(null);
                setTestError(null);
                onClose();
            },
        });
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-xl bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-foreground">Connect Google Sheet</h3>
                            <p className="text-xs text-muted-foreground">Stream live leads from any public Google Sheet</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs sm:text-sm">
                    {/* Campaign / Sheet Name */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Campaign / Label Name
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            placeholder="e.g. Q3 Meta Ads Campaign"
                            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-hidden transition"
                            required
                        />
                        {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                    </div>

                    {/* Google Sheet URL */}
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Google Sheet Link
                            </label>
                            <span className="text-[11px] text-primary font-medium">
                                "Anyone with the link can view"
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <div className="relative flex-1">
                                <input
                                    type="url"
                                    value={data.sheet_url}
                                    onChange={(e) => {
                                        setData('sheet_url', e.target.value);
                                        setTestResult(null);
                                        setTestError(null);
                                    }}
                                    placeholder="https://docs.google.com/spreadsheets/d/.../edit#gid=0"
                                    className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-xs font-mono focus:ring-2 focus:ring-primary outline-hidden transition pr-10"
                                    required
                                />
                                <Link2 className="w-4 h-4 text-muted-foreground absolute right-3 top-3" />
                            </div>
                            <button
                                type="button"
                                onClick={handleTest}
                                disabled={testing || !data.sheet_url}
                                className="px-3.5 py-2.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-semibold rounded-xl transition flex items-center gap-1.5 shrink-0 disabled:opacity-50"
                            >
                                {testing ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Testing...</span>
                                    </>
                                ) : (
                                    'Test Link'
                                )}
                            </button>
                        </div>
                        {errors.sheet_url && <p className="text-xs text-destructive mt-1">{errors.sheet_url}</p>}
                    </div>

                    {/* Test Results */}
                    {testResult && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-start gap-2.5">
                            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Verified! Found {testResult.total_rows} rows in sheet.</p>
                                <p className="text-[11px] opacity-80 mt-0.5">
                                    Headers: {testResult.headers?.slice(0, 5).join(', ')}...
                                </p>
                            </div>
                        </div>
                    )}

                    {testError && (
                        <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold">Connection Failed</p>
                                <p className="text-[11px] mt-0.5">{testError}</p>
                            </div>
                        </div>
                    )}

                    {/* Helper Box */}
                    <div className="p-3 rounded-xl bg-muted/60 border border-border text-muted-foreground text-xs space-y-1">
                        <div className="flex items-center gap-1.5 font-semibold text-foreground">
                            <HelpCircle className="w-3.5 h-3.5 text-primary" />
                            Google Sheet Sharing Instructions:
                        </div>
                        <p className="text-[11px] leading-relaxed">
                            Click <strong>Share</strong> in your Google Sheet &gt; set General Access to <strong>Anyone with the link</strong> &gt; copy and paste here.
                        </p>
                    </div>

                    {/* Refresh Interval */}
                    <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
                            Live Polling Frequency
                        </label>
                        <select
                            value={data.refresh_interval}
                            onChange={(e) => setData('refresh_interval', parseInt(e.target.value))}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-input bg-background text-foreground text-xs focus:ring-2 focus:ring-primary outline-hidden transition"
                        >
                            <option value={10}>Every 10 seconds (Ultra Fast)</option>
                            <option value={15}>Every 15 seconds (Recommended)</option>
                            <option value={30}>Every 30 seconds</option>
                            <option value={60}>Every 1 minute</option>
                        </select>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-muted rounded-xl transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={processing}
                            className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5 disabled:opacity-50"
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Connecting...</span>
                                </>
                            ) : (
                                'Save & Sync Leads'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
