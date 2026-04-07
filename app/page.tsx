"use client";

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

import { HomeLanding } from "@/components/home-landing";
import { useAuth } from "@/lib/auth-context";
import { getDefaultRouteForRole } from "@/lib/firebase/auth";

export default function Home() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) {
      navigate(getDefaultRouteForRole(user.role));
    }
  }, [isLoading, navigate, user]);

  return <HomeLanding user={user} />;
}
