"use client";

import {
  Checkbox as CheckboxPrimitive,
  CheckboxIndicator,
} from "@ui-sdk/react/checkbox";
import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

const Checkbox = ({
  className,
  ...props
}: Omit<
  React.ComponentProps<typeof CheckboxPrimitive>,
  "children" | "className"
> & {
  readonly className?: string | undefined;
}) => (
  <CheckboxPrimitive
    className={cn(
      "peer border-input group-has-[:focus-visible]/field-label:not-data-checked:border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 aria-invalid:aria-checked:border-primary dark:bg-input/30 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 data-checked:border-primary data-checked:bg-primary data-checked:text-primary-foreground group-has-[:focus-visible]/field-label:data-checked:border-primary dark:data-checked:bg-primary relative flex size-4 shrink-0 items-center justify-center rounded-[4px] border transition-colors outline-none group-has-disabled/field:opacity-50 group-has-[:focus-visible]/field-label:ring-0 after:absolute after:-inset-x-3 after:-inset-y-2 focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3",
      className
    )}
    {...props}
  >
    <CheckboxIndicator className="grid place-content-center text-current transition-none [&>svg]:size-3.5">
      <CheckIcon />
    </CheckboxIndicator>
  </CheckboxPrimitive>
);

export { Checkbox };
