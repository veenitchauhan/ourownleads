import React, { useState, useMemo } from 'react';
import { Head, router } from '@inertiajs/react';
import { 
    Shield, Users, FileSpreadsheet, Zap, Search, Key, LogIn, 
    LogOut, CheckCircle2, Lock, Eye, EyeOff, RefreshCw, X, AlertCircle, Building2, Calendar
} from 'lucide-react';

interface SheetInfo {
    id: number;
    name: string;
    is_active: boolean;
    leads_count: number;
}

interface UserItem {
    id: number;
    name: string;
    email: string;
    email_verified: boolean;
    created_at: string;
    created_formatted: string;
    created_relative: string;
    team_name: string;
    team_slug: string;
    sheets_count: number;
    sheets: SheetInfo[];
    active_sheet_name: string | null;
    total_leads: number;
}

interface Metrics {
    total_users: number;
    total_sheets: number;
    total_leads: number;
}

interface Props {
    users: UserItem[];
    metrics: Metrics;
    flash?: {
        success?: string;
        error?: string;
    };
}

export default function SuperadminDashboard({ users = [], metrics, flash }: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserItem | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
    const [passwordError, setPasswordError] = useState<string | null>(null);
    const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

    // Filter users
    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users;
        const q = searchQuery.toLowerCase();
        return users.filter(u => 
            u.name.toLowerCase().includes(q) || 
            u.email.toLowerCase().includes(q) ||
            u.team_name.toLowerCase().includes(q)
        );
    }, [users, searchQuery]);

    const handleOpenPasswordModal = (user: UserItem) => {
        setSelectedUserForPassword(user);
        setNewPassword('');
        setPasswordError(null);
        setPasswordSuccess(null);
    };

    const handleGenerateRandomPassword = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
        let pass = '';
        for (let i = 0; i < 10; i++) {
            pass += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setNewPassword(pass);
        setShowPassword(true);
    };

    const handleSubmitPassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedUserForPassword) return;

        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters long.');
            return;
        }

        setIsSubmittingPassword(true);
        setPasswordError(null);

        router.post(`/superadmin/users/${selectedUserForPassword.id}/password`, {
            password: newPassword,
        }, {
            onSuccess: () => {
                setIsSubmittingPassword(false);
                setPasswordSuccess(`Password updated successfully for ${selectedUserForPassword.name}!`);
                setTimeout(() => {
                    setSelectedUserForPassword(null);
                    setPasswordSuccess(null);
                }, 1500);
            },
            onError: (errs) => {
                setIsSubmittingPassword(false);
                setPasswordError(errs.password || 'Failed to update password.');
            },
        });
    };

    const handleImpersonate = (user: UserItem) => {
        if (confirm(`Login as ${user.name} (${user.email})? You can return to Superadmin anytime.`)) {
            router.post(`/superadmin/users/${user.id}/impersonate`);
        }
    };

    const handleLogout = () => {
        router.post('/superadmin/logout');
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-rose-500 selection:text-white">
            <Head title="Superadmin Portal - OurOwnLeads" />

            {/* Top Navigation Bar */}
            <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-900/40">
                            <Shield className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-sm tracking-tight text-white">OurOwnLeads</span>
                                <span className="text-[10px] uppercase font-black tracking-widest px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                    Superadmin
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-400">Master Control & User Management</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <a
                            href="/"
                            target="_blank"
                            className="hidden sm:inline-flex items-center gap-1 text-xs text-slate-400 hover:text-slate-200 font-medium px-3 py-1.5 rounded-xl border border-slate-800 hover:bg-slate-800 transition"
                        >
                            Open Main Site ↗
                        </a>
                        <button
                            onClick={handleLogout}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 px-3 py-1.5 rounded-xl bg-rose-950/30 border border-rose-900/50 hover:bg-rose-950/60 transition cursor-pointer"
                        >
                            <LogOut className="w-3.5 h-3.5" />
                            <span>Logout</span>
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8 w-full flex-1 space-y-6">
                {/* Flash Banner */}
                {flash?.success && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="font-semibold">{flash.success}</span>
                    </div>
                )}

                {/* KPI Ribbon */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Registered Users</p>
                            <p className="text-2xl font-black text-white mt-1">{metrics.total_users}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Active accounts</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-400 flex items-center justify-center">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Connected Google Sheets</p>
                            <p className="text-2xl font-black text-white mt-1">{metrics.total_sheets}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">Campaigns tracked</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-400 flex items-center justify-center">
                            <FileSpreadsheet className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800/80 rounded-2xl p-5 shadow-xs flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads Captured</p>
                            <p className="text-2xl font-black text-rose-400 mt-1">{metrics.total_leads}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">System-wide across all users</p>
                        </div>
                        <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-400 flex items-center justify-center">
                            <Zap className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 border border-slate-800/80 p-3.5 rounded-2xl">
                    <div className="relative w-full sm:w-80">
                        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search by name, email, workspace..."
                            className="w-full pl-9.5 pr-4 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-rose-500 transition"
                        />
                    </div>
                    <div className="text-xs text-slate-400 font-medium self-end sm:self-center">
                        Showing <strong className="text-white">{filteredUsers.length}</strong> user{filteredUsers.length !== 1 ? 's' : ''}
                    </div>
                </div>

                {/* Users Cards Grid */}
                {filteredUsers.length === 0 ? (
                    <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center">
                        <Users className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-slate-300">No users found</h3>
                        <p className="text-xs text-slate-500 mt-1">Try adjusting your search query.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredUsers.map((user) => (
                            <div
                                key={user.id}
                                className="bg-slate-900/80 border border-slate-800/90 hover:border-slate-700/80 rounded-2xl p-5 shadow-xs flex flex-col justify-between transition group"
                            >
                                <div>
                                    {/* User Header */}
                                    <div className="flex items-start justify-between gap-3 mb-4">
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-xl bg-linear-to-tr from-rose-500 to-indigo-600 text-white font-black text-sm flex items-center justify-center shrink-0 shadow-xs">
                                                {user.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="min-w-0">
                                                <h4 className="font-extrabold text-sm text-white truncate group-hover:text-rose-300 transition">
                                                    {user.name}
                                                </h4>
                                                <p className="text-xs text-slate-400 truncate">
                                                    {user.email}
                                                </p>
                                            </div>
                                        </div>

                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-400 border border-slate-700/50 shrink-0">
                                            #{user.id}
                                        </span>
                                    </div>

                                    {/* Details List */}
                                    <div className="space-y-2.5 py-3 border-y border-slate-800/80 text-xs">
                                        {/* Total Leads */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 flex items-center gap-1.5">
                                                <Zap className="w-3.5 h-3.5 text-rose-400" />
                                                <span>Captured Leads:</span>
                                            </span>
                                            <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-xs ${
                                                user.total_leads > 0 
                                                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' 
                                                    : 'bg-slate-800/60 text-slate-400'
                                            }`}>
                                                {user.total_leads} {user.total_leads === 1 ? 'Lead' : 'Leads'}
                                            </span>
                                        </div>

                                        {/* Sheets Count */}
                                        <div className="flex items-center justify-between">
                                            <span className="text-slate-400 flex items-center gap-1.5">
                                                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                                                <span>Google Sheets:</span>
                                            </span>
                                            <span className="font-semibold text-slate-200">
                                                {user.sheets_count > 0 ? `${user.sheets_count} connected` : 'None yet'}
                                            </span>
                                        </div>

                                        {/* Active Sheet Name */}
                                        {user.active_sheet_name && (
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className="text-slate-500 truncate max-w-[120px]">Campaign:</span>
                                                <span className="text-slate-300 truncate max-w-[170px] font-medium" title={user.active_sheet_name}>
                                                    {user.active_sheet_name}
                                                </span>
                                            </div>
                                        )}

                                        {/* Workspace */}
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <Building2 className="w-3 h-3 text-slate-500" />
                                                <span>Workspace:</span>
                                            </span>
                                            <span className="text-slate-300 font-medium">
                                                {user.team_name}
                                            </span>
                                        </div>

                                        {/* Registered Date */}
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-slate-500 flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-500" />
                                                <span>Joined:</span>
                                            </span>
                                            <span className="text-slate-400" title={user.created_formatted}>
                                                {user.created_relative}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2 mt-4 pt-1">
                                    <button
                                        onClick={() => handleOpenPasswordModal(user)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold border border-slate-700/50 transition cursor-pointer"
                                        title="Directly reset this user's password"
                                    >
                                        <Key className="w-3.5 h-3.5 text-amber-400" />
                                        <span>Set Password</span>
                                    </button>

                                    <button
                                        onClick={() => handleImpersonate(user)}
                                        className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-900/30 transition cursor-pointer"
                                        title="Log in directly as this user to view their dashboard"
                                    >
                                        <LogIn className="w-3.5 h-3.5" />
                                        <span>Login</span>
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Set Password Modal */}
            {selectedUserForPassword && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl relative">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center">
                                    <Key className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">Set User Password</h3>
                                    <p className="text-xs text-slate-400">
                                        For <strong>{selectedUserForPassword.name}</strong> ({selectedUserForPassword.email})
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedUserForPassword(null)}
                                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {passwordSuccess && (
                            <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span>{passwordSuccess}</span>
                            </div>
                        )}

                        {passwordError && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                                <span>{passwordError}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmitPassword} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                                    New Password
                                </label>
                                <div className="relative">
                                    <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        placeholder="Enter new password (min 6 chars)"
                                        required
                                        autoFocus
                                        className="w-full pl-10 pr-10 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition"
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>

                            {/* Generate Random Button */}
                            <button
                                type="button"
                                onClick={handleGenerateRandomPassword}
                                className="w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700/60 transition flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                                <span>Generate Strong Random Password</span>
                            </button>

                            {/* Actions */}
                            <div className="flex items-center justify-end gap-2.5 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setSelectedUserForPassword(null)}
                                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition cursor-pointer"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmittingPassword || !newPassword}
                                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-xl shadow-md transition disabled:opacity-50 cursor-pointer"
                                >
                                    {isSubmittingPassword ? 'Saving...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
