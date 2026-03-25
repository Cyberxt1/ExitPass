"use client";

import * as React from "react";
import { Link as RouterLink, type LinkProps as RouterLinkProps } from "react-router-dom";

type AppLinkProps = Omit<RouterLinkProps, "to"> & {
  href: RouterLinkProps["to"];
};

export const Link = React.forwardRef<HTMLAnchorElement, AppLinkProps>(
  ({ href, ...props }, ref) => <RouterLink ref={ref} to={href} {...props} />,
);

Link.displayName = "Link";
