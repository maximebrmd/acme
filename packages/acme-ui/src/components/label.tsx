"use client";

import * as React from "react";

import { cn } from "../lib/utils";

// htmlFor is passed by name so the accessibility lint sees the association
// that callers make.
const Label = ({
  className,
  htmlFor,
  ...props
}: React.ComponentProps<"label">) => (
  <label
    htmlFor={htmlFor}
    data-slot="label"
    className={cn(
      "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
      className
    )}
    {...props}
  />
);

export { Label };
