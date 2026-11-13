"use client";

import {
  Tooltip as TooltipPrimitive,
  TooltipArrow as TooltipArrowPrimitive,
  TooltipContent as TooltipContentPrimitive,
  TooltipTrigger as TooltipTriggerPrimitive,
} from "@ui-sdk/react/tooltip";
import type * as React from "react";

import { cn } from "../lib/utils";

const Tooltip = ({
  delay = 0,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive>) => (
  <TooltipPrimitive delay={delay} {...props} />
);

const TooltipTrigger = (
  props: React.ComponentProps<typeof TooltipTriggerPrimitive>
) => <TooltipTriggerPrimitive data-slot="tooltip-trigger" {...props} />;

const TooltipContent = ({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: Omit<
  React.ComponentProps<typeof TooltipContentPrimitive>,
  "children" | "className"
> & {
  readonly children?: React.ReactNode;
  readonly className?: string | undefined;
}) => (
  <TooltipContentPrimitive
    data-slot="tooltip-content"
    align={align}
    alignOffset={alignOffset}
    side={side}
    sideOffset={sideOffset}
    className={cn(
      "bg-foreground text-background data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pr-1.5 data-instant:animate-none **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm",
      className
    )}
    {...props}
  >
    {children}
    <TooltipArrowPrimitive className="bg-foreground fill-foreground z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5" />
  </TooltipContentPrimitive>
);

export { Tooltip, TooltipTrigger, TooltipContent };
