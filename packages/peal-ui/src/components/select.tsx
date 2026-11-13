"use client";

import {
  SelectContent as SelectContentPrimitive,
  SelectGroup as SelectGroupPrimitive,
  SelectGroupLabel as SelectGroupLabelPrimitive,
  SelectItem as SelectItemPrimitive,
  SelectItemIndicator,
  SelectItemText,
  SelectSeparator as SelectSeparatorPrimitive,
  SelectTrigger as SelectTriggerPrimitive,
  SelectValue as SelectValuePrimitive,
} from "@ui-sdk/react/select";
import { ChevronDownIcon, CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

const SelectGroup = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectGroupPrimitive>>) => (
  <SelectGroupPrimitive
    className={cn("scroll-my-1 p-1", className)}
    {...props}
  />
);

const SelectValue = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectValuePrimitive>>) => (
  <SelectValuePrimitive
    className={cn("flex flex-1 text-left", className)}
    {...props}
  />
);

const SelectTrigger = ({
  className,
  size = "default",
  children,
  ...props
}: Omit<
  WithClassName<React.ComponentProps<typeof SelectTriggerPrimitive>>,
  "children"
> & {
  readonly children?: React.ReactNode;
  readonly size?: "sm" | "default";
}) => (
  <SelectTriggerPrimitive
    data-size={size}
    className={cn(
      "border-input focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:border-destructive aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 flex w-fit items-center justify-between gap-1.5 rounded-lg border bg-transparent py-2 pr-2 pl-2.5 text-sm whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:ring-3 data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    {children}
    <ChevronDownIcon
      aria-hidden
      className="text-muted-foreground pointer-events-none size-4"
    />
  </SelectTriggerPrimitive>
);

const SelectContent = ({
  className,
  side = "bottom",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  alignItemWithTrigger = true,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectContentPrimitive>>) => (
  <SelectContentPrimitive
    side={side}
    sideOffset={sideOffset}
    align={align}
    alignOffset={alignOffset}
    alignItemWithTrigger={alignItemWithTrigger}
    data-align-trigger={alignItemWithTrigger}
    className={cn(
      "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 relative isolate z-50 max-h-(--available-height) w-(--anchor-width) min-w-36 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg shadow-md ring-1 duration-100 data-[align-trigger=true]:animate-none",
      className
    )}
    {...props}
  />
);

const SelectLabel = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectGroupLabelPrimitive>>) => (
  <SelectGroupLabelPrimitive
    className={cn("text-muted-foreground px-1.5 py-1 text-xs", className)}
    {...props}
  />
);

const SelectItem = ({
  className,
  children,
  ...props
}: Omit<
  WithClassName<React.ComponentProps<typeof SelectItemPrimitive>>,
  "children"
> & {
  readonly children?: React.ReactNode;
}) => (
  <SelectItemPrimitive
    className={cn(
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground relative flex w-full cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
      className
    )}
    {...props}
  >
    <SelectItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
      {children}
    </SelectItemText>
    <SelectItemIndicator
      render={
        <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center" />
      }
    >
      <CheckIcon className="pointer-events-none" />
    </SelectItemIndicator>
  </SelectItemPrimitive>
);

const SelectSeparator = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SelectSeparatorPrimitive>>) => (
  <SelectSeparatorPrimitive
    className={cn("bg-border pointer-events-none -mx-1 my-1 h-px", className)}
    {...props}
  />
);

export { Select } from "@ui-sdk/react/select";

export {
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
