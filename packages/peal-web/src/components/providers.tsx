"use client";

import { RegistryProvider } from "@effect/atom-react";
import { Toaster } from "peal-ui/components/sonner";
import type { ReactNode } from "react";

// Client context for every page: an atom registry per visitor (also during
// server rendering, so requests never share state) and toasts. Tooltips
// group without a provider.
export const Providers = ({ children }: { readonly children: ReactNode }) => (
  <RegistryProvider>
    {children}
    <Toaster />
  </RegistryProvider>
);
