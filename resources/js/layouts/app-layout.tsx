import React from 'react';
import { usePage, router } from '@inertiajs/react';
import AppLayoutTemplate from '@/layouts/app/app-sidebar-layout';
import type { BreadcrumbItem } from '@/types';

export default function AppLayout({
    breadcrumbs = [],
    children,
}: {
    breadcrumbs?: BreadcrumbItem[];
    children: React.ReactNode;
}) {
    const { isImpersonating, auth } = usePage<any>().props;

    return (
        <div className="min-h-screen flex flex-col">
            {isImpersonating && (
                <div className="bg-linear-to-r from-amber-500 to-amber-600 text-amber-950 px-4 py-2.5 flex items-center justify-between text-xs font-extrabold shadow-lg z-50 sticky top-0 border-b border-amber-600/50">
                    <div className="flex items-center gap-2.5">
                        <span className="text-base">👑</span>
                        <span>
                            Superadmin Impersonation: Viewing as <strong className="underline underline-offset-2">{auth?.user?.name}</strong> ({auth?.user?.email})
                        </span>
                    </div>
                    <button
                        onClick={() => router.post('/superadmin/stop-impersonation')}
                        className="px-3 py-1 bg-amber-950 hover:bg-black text-amber-100 rounded-lg shadow-sm transition text-xs font-bold cursor-pointer"
                    >
                        Exit Impersonation & Return to Superadmin ↗
                    </button>
                </div>
            )}
            <AppLayoutTemplate breadcrumbs={breadcrumbs}>
                {children}
            </AppLayoutTemplate>
        </div>
    );
}
