"use client";

import {
  CircleCheckIcon,
  InfoIcon,
  TriangleAlertIcon,
  OctagonXIcon,
  Loader2Icon,
} from "lucide-react";
import { Toaster as Sonner } from "sonner";
import type { ToasterProps } from "sonner";

// Sonner reads its colours from these custom properties; point them at the
// theme. The type admits custom properties, which React.CSSProperties lacks.
const themeVariables: React.CSSProperties & Record<`--${string}`, string> = {
  "--border-radius": "var(--radius)",
  "--normal-bg": "var(--popover)",
  "--normal-border": "var(--border)",
  "--normal-text": "var(--popover-foreground)",
};

// Dark mode follows the operating system (see globals.css), and so do toasts.
const Toaster = ({ ...props }: ToasterProps) => (
  <Sonner
    theme="system"
    className="group"
    icons={{
      error: <OctagonXIcon className="size-4" />,
      info: <InfoIcon className="size-4" />,
      loading: <Loader2Icon className="size-4 animate-spin" />,
      success: <CircleCheckIcon className="size-4" />,
      warning: <TriangleAlertIcon className="size-4" />,
    }}
    style={themeVariables}
    toastOptions={{
      classNames: {
        toast: "cn-toast",
      },
    }}
    {...props}
  />
);

export { Toaster };
