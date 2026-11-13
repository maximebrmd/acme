"use client";

import { Separator as SeparatorPrimitive } from "@ui-sdk/react/separator";
import type * as React from "react";

import { cn } from "../lib/utils";

const Separator = ({
  className,
  orientation = "horizontal",
  ...props
}: Omit<React.ComponentProps<typeof SeparatorPrimitive>, "className"> & {
  readonly className?: string | undefined;
}) => (
  <SeparatorPrimitive
    data-slot="separator"
    orientation={orientation}
    className={cn(
      "bg-border shrink-0 data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
      className
    )}
    {...props}
  />
);

export { Separator };
