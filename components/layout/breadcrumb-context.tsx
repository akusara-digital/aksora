"use client";

import React, { createContext, useContext, useState, useMemo, type ReactNode } from "react";

export type Crumb = { label: string; href?: string; active?: boolean };

interface BreadcrumbContextType {
  crumbs: Crumb[] | null;
  setCrumbs: (crumbs: Crumb[] | null) => void;
  isInsideProvider: boolean;
}

const BreadcrumbContext = createContext<BreadcrumbContextType>({
  crumbs: null,
  setCrumbs: () => {},
  isInsideProvider: false,
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<Crumb[] | null>(null);

  const value = useMemo(
    () => ({
      crumbs,
      setCrumbs,
      isInsideProvider: true,
    }),
    [crumbs]
  );

  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>;
}

export function useBreadcrumbContext() {
  return useContext(BreadcrumbContext);
}
