import bcrypt from "bcryptjs";

export const MASTER_ADMIN_USERNAME = "admin";
const MASTER_ADMIN_PASSWORD_HASH = "$2b$10$a7JACaHExycZF4Lxlk5kKepmOTCL0goywud4ZnHIKaUwLJs3S..0W"; // "admin123"

export async function verifyMasterAdmin(username: string, password: string): Promise<boolean> {
	if (username !== MASTER_ADMIN_USERNAME) {
		return false;
	}
	return bcrypt.compare(password, MASTER_ADMIN_PASSWORD_HASH);
}
