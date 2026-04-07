import type { ActionCodeSettings } from "firebase/auth";

export function getPasswordResetActionSettings(): ActionCodeSettings | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return {
    url: `${window.location.origin}/reset-password`,
    handleCodeInApp: false,
  };
}
