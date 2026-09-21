# Our Own Leads project conventions

- Every navigable page must have a meaningful URL. Use Next.js routing rather than local component state to switch between pages.
- Keep login at `/login`, registration at `/signup`, and workspace paths centralized in `lib/routes.ts`.
- New pages must support direct navigation, refresh, and browser Back/Forward. Preserve safe workspace return paths through sign-in.
- Visually verify authentication layouts at desktop and mobile widths. Notification containers must not participate in the authentication panel grid.
- Keep the brand space separated: Our Own Leads.
