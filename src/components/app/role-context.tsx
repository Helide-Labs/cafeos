"use client";

import { createContext, useContext } from "react";
import type { AppRole } from "@/lib/roles";

const RoleContext = createContext<AppRole>("Owner");

export function RoleProvider({ role, children }: { role: AppRole; children: React.ReactNode }) {
  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>;
}

export function useAppRole() {
  return useContext(RoleContext);
}
