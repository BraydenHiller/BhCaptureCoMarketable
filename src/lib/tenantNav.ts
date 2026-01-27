export type TenantNavItem = {
	key: string;
	label: string;
	href: string;
};

export const tenantNav: readonly TenantNavItem[] = [
	{
		key: 'dashboard',
		label: 'Dashboard',
		href: '/app',
	},
	{
		key: 'galleries',
		label: 'Galleries',
		href: '/galleries',
	},
] as const;
