import { getSession } from './session';
import { redirect } from 'next/navigation';

type MasterAdminSession = {
	sub: string;
	role: 'MASTER_ADMIN';
	iat: number;
	exp: number;
};

export async function requireMasterAdminSession(): Promise<MasterAdminSession> {
	const session = await getSession();

	if (!session || session.role !== 'MASTER_ADMIN') {
		redirect('/login');
	}

	return {
		sub: session.sub,
		role: session.role,
		iat: session.iat,
		exp: session.exp,
	};
}
