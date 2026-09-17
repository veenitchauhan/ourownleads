import React, { useState } from 'react';
import { Head, useForm } from '@inertiajs/react';
import { Shield, Lock, ArrowRight, Key, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface Props {
    configuredEmail?: string;
    errors?: Record<string, string>;
}

export default function SuperadminLogin({ configuredEmail, errors = {} }: Props) {
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors: formErrors } = useForm({
        email: configuredEmail || 'superadmin@ourownleads.test',
        password: '',
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        post('/superadmin/login');
    };

    const displayError = formErrors.password || formErrors.email || errors.password;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
            <Head title="Superadmin Portal Login - OurOwnLeads" />

            {/* Background Ambient Glow */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-rose-600/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                {/* Brand Badge */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-linear-to-tr from-rose-500 to-amber-500 text-white shadow-2xl shadow-rose-500/30 mb-4 ring-4 ring-rose-500/20">
                        <Shield className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                        Superadmin Portal
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-400 mt-1.5 max-w-xs mx-auto">
                        Restricted administrative access. Authenticate using the master key from your <code className="text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/50">.env</code> file.
                    </p>
                </div>

                {/* Login Card */}
                <div className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 p-6 sm:p-8 rounded-3xl shadow-2xl">
                    {displayError && (
                        <div className="mb-6 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                            <span>{displayError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                Superadmin Identity / Email
                            </label>
                            <div className="relative">
                                <Key className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                    type="text"
                                    value={data.email}
                                    onChange={(e) => setData('email', e.target.value)}
                                    placeholder="superadmin@ourownleads.test"
                                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                                />
                            </div>
                        </div>

                        {/* Password Input */}
                        <div>
                            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                                Master Superadmin Password
                            </label>
                            <div className="relative">
                                <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={data.password}
                                    onChange={(e) => setData('password', e.target.value)}
                                    placeholder="Enter SUPERADMIN_PASSWORD from .env"
                                    autoFocus
                                    required
                                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-hidden focus:ring-2 focus:ring-rose-500 focus:border-transparent transition"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3.5 top-2.5 text-slate-500 hover:text-slate-300 transition"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1.5">
                                Matched with <code className="text-slate-400">SUPERADMIN_PASSWORD</code> in <code className="text-slate-400">.env</code>
                            </p>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            disabled={processing || !data.password}
                            className="w-full mt-2 py-3 px-4 bg-linear-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-900/30 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                        >
                            <span>{processing ? 'Authenticating...' : 'Enter Superadmin Portal'}</span>
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    {/* Back link */}
                    <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
                        <a
                            href="/"
                            className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition"
                        >
                            ← Return to Customer App
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
