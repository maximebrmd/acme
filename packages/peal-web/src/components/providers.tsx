"use client";

import { RegistryProvider } from "@effect/atom-react";
import { Toaster } from "peal-ui/components/sonner";
import { TooltipProvider } from "peal-ui/components/tooltip";
import type { ReactNode } from "react";

// Client context for every page: an atom registry per visitor (also during
// server rendering, so requests never share state), tooltips and toasts.
export const Providers = ({ children }: { readonly children: ReactNode }) => (
  <RegistryProvider>
    <TooltipProvider>
      {children}
      <Toaster />
    </TooltipProvider>
  </RegistryProvider>
);
