"use client";

import {
  Popover as PopoverPrimitive,
  PopoverContent as PopoverContentPrimitive,
  PopoverDescription as PopoverDescriptionPrimitive,
  PopoverTitle as PopoverTitlePrimitive,
  PopoverTrigger as PopoverTriggerPrimitive,
} from "@ui-sdk/react/popover";
import type * as React from "react";

import { cn } from "../lib/utils";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

const Popover = (props: React.ComponentProps<typeof PopoverPrimitive>) => (
  <PopoverPrimitive {...props} />
);

const PopoverTrigger = (
  props: React.ComponentProps<typeof PopoverTriggerPrimitive>
) => <PopoverTriggerPrimitive {...props} />;

const PopoverContent = ({
  className,
  align = "center",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverContentPrimitive>>) => (
  <PopoverContentPrimitive
    data-slot="popover-content"
    align={align}
    alignOffset={alignOffset}
    side={side}
    sideOffset={sideOffset}
    className={cn(
      "bg-popover text-popover-foreground ring-foreground/10 z-50 flex w-72 origin-(--transform-origin) flex-col gap-2.5 rounded-lg p-2.5 text-sm shadow-md ring-1 outline-hidden transition-[opacity,scale] duration-150 data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0",
      className
    )}
    {...props}
  />
);

const PopoverHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="popover-header"
    className={cn("flex flex-col gap-0.5 text-sm", className)}
    {...props}
  />
);

const PopoverTitle = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverTitlePrimitive>>) => (
  <PopoverTitlePrimitive
    data-slot="popover-title"
    className={cn("font-medium", className)}
    {...props}
  />
);

const PopoverDescription = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof PopoverDescriptionPrimitive>>) => (
  <PopoverDescriptionPrimitive
    data-slot="popover-description"
    className={cn("text-muted-foreground", className)}
    {...props}
  />
);

export {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
};
