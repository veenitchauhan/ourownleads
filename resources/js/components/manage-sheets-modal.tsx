import React from 'react';
import { router } from '@inertiajs/react';
import { FileSpreadsheet, Trash2, CheckCircle2, ExternalLink, X, Plus, Clock } from 'lucide-react';

interface SheetItem {
    id: number;
    name: string;
    sheet_url: string;
    refresh_interval: number;
    is_active: boolean;
}

interface ManageSheetsModalProps {
    sheets: SheetItem[];
    activeSheetId?: number;
    isOpen: boolean;
    onClose: () => void;
    onOpenAddModal: () => void;
}

export default function ManageSheetsModal({
    sheets = [],
    activeSheetId,
    isOpen,
    onClose,
    onOpenAddModal,
}: ManageSheetsModalProps) {
    if (!isOpen) return null;

    const handleSetActive = (sheetId: number) => {
        router.post(`/sheets/${sheetId}/activate`, {}, {
            preserveScroll: true,
            onSuccess: () => onClose(),
        });
    };

    const handleDelete = (sheetId: number, sheetName: string) => {
        if (confirm(`Are you sure you want to remove "${sheetName}"?`)) {
            router.delete(`/sheets/${sheetId}`, {
                preserveScroll: true,
            });
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
            <div className="relative w-full max-w-lg bg-card text-card-foreground rounded-2xl shadow-2xl border border-border overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-muted/40">
                    <div>
                        <h3 className="text-base font-bold text-foreground">Connected Google Sheets</h3>
                        <p className="text-xs text-muted-foreground">Switch campaigns or manage lead sources</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg p-1.5 transition"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
                    {sheets.length === 0 ? (
                        <div className="text-center py-8">
                            <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                            <p className="text-sm font-semibold text-foreground">No Google Sheets connected yet</p>
                        </div>
                    ) : (
                        <div className="space-y-2.5">
                            {sheets.map((s) => {
                                const isActive = s.id === activeSheetId;
                                return (
                                    <div
                                        key={s.id}
                                        className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 ${
                                            isActive
                                                ? 'bg-primary/10 border-primary/40'
                                                : 'bg-card border-border hover:border-muted-foreground/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3 min-w-0">
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                                            }`}>
                                                <FileSpreadsheet className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <h4 className="text-xs sm:text-sm font-bold text-foreground truncate">
                                                        {s.name}
                                                    </h4>
                                                    {isActive && (
                                                        <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> Every {s.refresh_interval || 15}s
                                                    </span>
                                                    <a
                                                        href={s.sheet_url}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="text-primary hover:underline flex items-center gap-0.5"
                                                    >
                                                        Sheet <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {!isActive && (
                                                <button
                                                    onClick={() => handleSetActive(s.id)}
                                                    className="px-2.5 py-1 bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-bold rounded-lg border border-border transition"
                                                >
                                                    Select
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(s.id, s.name)}
                                                className="p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition"
                                                title="Delete sheet"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {/* Add Sheet CTA */}
                    <button
                        onClick={() => {
                            onClose();
                            onOpenAddModal();
                        }}
                        className="w-full py-2.5 border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-xl text-primary text-xs font-bold flex items-center justify-center gap-2 transition mt-2"
                    >
                        <Plus className="w-4 h-4" /> Connect Another Sheet
                    </button>
                </div>
            </div>
        </div>
    );
}
