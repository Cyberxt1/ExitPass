import type { UserRole } from "@/lib/types";

export type StaffPortalSlug = "admin" | "security" | "chaplaincy";

type StaffPortalConfig = {
  slug: StaffPortalSlug;
  label: string;
  title: string;
  description: string;
  loginDescription: string;
  signupDescription: string;
  directSignupRole: Exclude<UserRole, "student" | "super_admin">;
  leadEmail: string;
  acceptedRoles: UserRole[];
};

export const staffPortals: Record<StaffPortalSlug, StaffPortalConfig> = {
  admin: {
    slug: "admin",
    label: "Admin",
    title: "Admin Access",
    description: "Authorized administrators can sign in from this dedicated route.",
    loginDescription: "Use your approved admin credentials to continue.",
    signupDescription: "Create a hall admin account here or finish setup from an approved invitation.",
    directSignupRole: "hall_admin",
    leadEmail: "oluokundavid4@gmail.com",
    acceptedRoles: ["hall_admin", "super_admin"],
  },
  security: {
    slug: "security",
    label: "Security",
    title: "Security Access",
    description: "Authorized security staff can sign in from this dedicated route.",
    loginDescription: "Use your approved security credentials to continue.",
    signupDescription: "Create a security account here or finish setup from an approved invitation.",
    directSignupRole: "security",
    leadEmail: "xplick@gmail.com",
    acceptedRoles: ["security"],
  },
  chaplaincy: {
    slug: "chaplaincy",
    label: "Chaplaincy",
    title: "Chaplaincy Access",
    description: "Authorized chaplaincy staff can sign in from this dedicated route.",
    loginDescription: "Use your approved chaplaincy credentials to continue.",
    signupDescription: "Create a chaplaincy account here or finish setup from an approved invitation.",
    directSignupRole: "chaplaincy",
    leadEmail: "blyinkr4@gmail.com",
    acceptedRoles: ["chaplaincy"],
  },
};

export function getPortalForRole(role?: UserRole | null): StaffPortalSlug {
  switch (role) {
    case "security":
      return "security";
    case "chaplaincy":
      return "chaplaincy";
    case "hall_admin":
    case "super_admin":
    default:
      return "admin";
  }
}
