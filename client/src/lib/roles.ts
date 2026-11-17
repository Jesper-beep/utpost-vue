import type { User } from "@utpost/shared";

export const ROLE_LABELS: Record<User["role"], string> = {
	editor: "Redaktör",
	member: "Medlem",
};
