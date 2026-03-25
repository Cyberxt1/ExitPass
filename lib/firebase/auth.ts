import { UserRole } from "@/lib/types";

export const ADMIN_ROLES: UserRole[] = [
  "hall_admin",
  "chaplaincy",
  "security",
  "super_admin",
];

export function isAdminRole(role?: UserRole | null) {
  return !!role && ADMIN_ROLES.includes(role);
}

export function getDefaultRouteForRole(role?: UserRole | null) {
  switch (role) {
    case "student":
      return "/dashboard";
    case "security":
      return "/security-scanner";
    case "hall_admin":
    case "chaplaincy":
    case "super_admin":
      return "/admin-dashboard";
    default:
      return "/login";
  }
}
