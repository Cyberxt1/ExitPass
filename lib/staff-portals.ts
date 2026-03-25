import type { UserRole } from "@/lib/types";

export type StaffPortalSlug = "admin" | "security" | "chaplaincy";

type StaffPortalConfig = {
  slug: StaffPortalSlug;
  label: string;
  title: string;
  description: string;
  loginDescription: string;
  signupDescription: string;
  leadEmail: string;
  acceptedRoles: UserRole[];
};

export const staffPortals: Record<StaffPortalSlug, StaffPortalConfig> = {
  admin: {
    slug: "admin",
    label: "Admin",
    title: "Admin Access",
    description: "Hall admins and the platform admin can sign in or complete invite-based onboarding here.",
    loginDescription: "Sign in as a hall admin or the main platform administrator.",
    signupDescription: "Use a hall-admin invite link or the lead admin email to join this portal.",
    leadEmail: "oluokundavid4@gmail.com",
    acceptedRoles: ["hall_admin", "super_admin"],
  },
  security: {
    slug: "security",
    label: "Security",
    title: "Security Access",
    description: "Security staff can sign in or activate their account from this separate entrance.",
    loginDescription: "Sign in as security staff to verify passes and view gate history.",
    signupDescription: "Use a security invite link or the lead security email to activate access.",
    leadEmail: "xplick@gmail.com",
    acceptedRoles: ["security"],
  },
  chaplaincy: {
    slug: "chaplaincy",
    label: "Chaplaincy",
    title: "Chaplaincy Access",
    description: "Chapel reviewers can sign in or create their access from this dedicated portal.",
    loginDescription: "Sign in as chapel staff to review requests before hall approval.",
    signupDescription: "Use a chapel invite link or the lead chapel email to activate access.",
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
