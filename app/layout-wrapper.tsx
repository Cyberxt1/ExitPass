"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";

const PUBLIC_ROUTES = [
  "/",
  "/about",
  "/admin",
  "/chaplaincy",
  "/faqs",
  "/help",
  "/login",
  "/security",
  "/signup",
  "/staff-join",
  "/forgot-password",
];

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.some((route) => {
    if (route === "/") {
      return pathname === "/";
    }

    return pathname === route || pathname.startsWith(`${route}/`);
  });
}

export function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !isPublicRoute(pathname)) {
      router.push("/login");
      return;
    }

    if (
      user &&
      ["/login", "/signup", "/staff-join", "/forgot-password", "/admin", "/security", "/chaplaincy"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) {
      router.push(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, pathname, router, user]);

  return children;
}
