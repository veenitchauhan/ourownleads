export const workspaceRoutes: Record<string, string> = {
  Overview: '/dashboard',
  Leads: '/leads',
  Conversations: '/conversations',
  'Business knowledge': '/knowledge',
  'Your assistant': '/assistant',
  WhatsApp: '/whatsapp',
  Settings: '/settings',
  Branding: '/branding',
};
export const publicRoutes = ['/', '/login', '/signup'];
export function viewForPath(path: string) {
  return Object.keys(workspaceRoutes).find(view => workspaceRoutes[view] === path) || 'Overview';
}
export function safeReturnPath(path: string | null) {
  return path && Object.values(workspaceRoutes).includes(path) ? path : '/dashboard';
}

export const adminRoutes={overview:'/admin',settings:'/admin/settings'} as const;
