"use client";

import {
  Menu,
  MenuCheckboxItem,
  MenuContent,
  MenuGroup,
  MenuGroupLabel,
  MenuItem,
  MenuItemIndicator,
  MenuRadioGroup,
  MenuRadioItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from "@ui-sdk/react/menu";
import { ChevronRightIcon, CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

type WithChildren<Props> = Omit<Props, "children"> & {
  readonly children?: React.ReactNode;
};

const contentClassName =
  "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 z-50 max-h-(--available-height) w-(--anchor-width) min-w-32 origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-lg p-1 shadow-md ring-1 duration-100 outline-none data-closed:overflow-hidden";

const DropdownMenu = (props: React.ComponentProps<typeof Menu>) => (
  <Menu {...props} />
);

const DropdownMenuTrigger = (
  props: React.ComponentProps<typeof MenuTrigger>
) => <MenuTrigger {...props} />;

const DropdownMenuContent = ({
  align = "start",
  alignOffset = 0,
  side = "bottom",
  sideOffset = 4,
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuContent>>) => (
  <MenuContent
    align={align}
    alignOffset={alignOffset}
    side={side}
    sideOffset={sideOffset}
    className={cn(contentClassName, className)}
    {...props}
  />
);

const DropdownMenuGroup = (props: React.ComponentProps<typeof MenuGroup>) => (
  <MenuGroup {...props} />
);

const DropdownMenuLabel = ({
  className,
  inset,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuGroupLabel>> & {
  readonly inset?: boolean;
}) => (
  <MenuGroupLabel
    data-inset={inset}
    className={cn(
      "text-muted-foreground px-1.5 py-1 text-xs font-medium data-inset:pl-7",
      className
    )}
    {...props}
  />
);

const DropdownMenuItem = ({
  className,
  inset,
  variant = "default",
  ...props
}: WithClassName<React.ComponentProps<typeof MenuItem>> & {
  readonly inset?: boolean;
  readonly variant?: "default" | "destructive";
}) => (
  <MenuItem
    data-inset={inset}
    data-variant={variant}
    destructive={variant === "destructive"}
    className={cn(
      "group/dropdown-menu-item data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-[variant=destructive]:text-destructive-text data-[variant=destructive]:data-highlighted:bg-destructive/10 data-[variant=destructive]:data-highlighted:text-destructive-text dark:data-[variant=destructive]:data-highlighted:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive relative flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  />
);

const DropdownMenuSub = (props: React.ComponentProps<typeof MenuSub>) => (
  <MenuSub {...props} />
);

const DropdownMenuSubTrigger = ({
  className,
  inset,
  children,
  ...props
}: WithChildren<WithClassName<React.ComponentProps<typeof MenuSubTrigger>>> & {
  readonly inset?: boolean;
}) => (
  <MenuSubTrigger
    data-inset={inset}
    className={cn(
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground not-data-[variant=destructive]:data-highlighted:**:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground flex cursor-default items-center gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden select-none data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRightIcon aria-hidden className="ml-auto" />
  </MenuSubTrigger>
);

const DropdownMenuSubContent = ({
  align = "start",
  alignOffset = -3,
  side = "right",
  sideOffset = 0,
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuSubContent>>) => (
  <MenuSubContent
    className={cn(
      contentClassName,
      "bg-popover text-popover-foreground ring-foreground/10 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 w-auto min-w-[96px] rounded-lg p-1 shadow-lg ring-1 duration-100",
      className
    )}
    align={align}
    alignOffset={alignOffset}
    side={side}
    sideOffset={sideOffset}
    {...props}
  />
);

const DropdownMenuCheckboxItem = ({
  className,
  children,
  inset,
  ...props
}: WithChildren<
  WithClassName<React.ComponentProps<typeof MenuCheckboxItem>>
> & {
  readonly inset?: boolean;
}) => (
  <MenuCheckboxItem
    data-inset={inset}
    className={cn(
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    <span
      className="pointer-events-none absolute right-2 flex items-center justify-center"
      data-slot="dropdown-menu-checkbox-item-indicator"
    >
      <MenuItemIndicator>
        <CheckIcon />
      </MenuItemIndicator>
    </span>
    {children}
  </MenuCheckboxItem>
);

const DropdownMenuRadioGroup = (
  props: React.ComponentProps<typeof MenuRadioGroup>
) => <MenuRadioGroup {...props} />;

const DropdownMenuRadioItem = ({
  className,
  children,
  inset,
  ...props
}: WithChildren<WithClassName<React.ComponentProps<typeof MenuRadioItem>>> & {
  readonly inset?: boolean;
}) => (
  <MenuRadioItem
    data-inset={inset}
    className={cn(
      "data-highlighted:bg-accent data-highlighted:text-accent-foreground data-highlighted:**:text-accent-foreground relative flex cursor-default items-center gap-1.5 rounded-md py-1 pr-8 pl-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:pl-7 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
      className
    )}
    {...props}
  >
    <span
      className="pointer-events-none absolute right-2 flex items-center justify-center"
      data-slot="dropdown-menu-radio-item-indicator"
    >
      <MenuItemIndicator>
        <CheckIcon />
      </MenuItemIndicator>
    </span>
    {children}
  </MenuRadioItem>
);

const DropdownMenuSeparator = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof MenuSeparator>>) => (
  <MenuSeparator
    className={cn("bg-border -mx-1 my-1 h-px", className)}
    {...props}
  />
);

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.ComponentProps<"span">) => (
  <span
    data-slot="dropdown-menu-shortcut"
    className={cn(
      "text-muted-foreground group-data-highlighted/dropdown-menu-item:text-accent-foreground ml-auto text-xs tracking-widest",
      className
    )}
    {...props}
  />
);

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
