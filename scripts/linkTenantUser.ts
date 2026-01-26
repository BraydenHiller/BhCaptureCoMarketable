import { prisma } from '../src/db/prisma';

const cognitoSub = process.argv[2];
const tenantId = process.argv[3];
const email = process.argv[4];

if (!cognitoSub || !tenantId || !email) {
	console.error('Usage: node scripts/linkTenantUser.ts <cognitoSub> <tenantId> <email>');
	process.exit(1);
}

async function main() {
	try {
		const user = await prisma.user.upsert({
			where: { cognitoSub },
			update: {
				role: 'TENANT',
				status: 'ACTIVE',
				tenantId,
			},
			create: {
				cognitoSub,
				role: 'TENANT',
				status: 'ACTIVE',
				tenantId,
				email,
			},
		});

		console.log(`User linked successfully: id=${user.id}, cognitoSub=${user.cognitoSub}, tenantId=${user.tenantId}, email=${user.email}`);
	} catch (error) {
		console.error('Error linking user:', error);
		process.exit(1);
	} finally {
		await prisma.$disconnect();
	}
}

main();
