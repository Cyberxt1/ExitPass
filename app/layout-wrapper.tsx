"use client";

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  "/reset-password",
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
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!user && !isPublicRoute(pathname)) {
      navigate("/login");
      return;
    }

    if (
      user &&
      ["/login", "/signup", "/staff-join", "/forgot-password", "/admin", "/security", "/chaplaincy"].some(
        (route) => pathname === route || pathname.startsWith(`${route}/`),
      )
    ) {
      navigate(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, navigate, pathname, user]);

  return children;
}
