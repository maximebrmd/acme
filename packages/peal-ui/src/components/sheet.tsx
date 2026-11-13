"use client";

import {
  Drawer as SheetPrimitive,
  DrawerBackdrop as SheetBackdropPrimitive,
  DrawerClose as SheetClosePrimitive,
  DrawerContent as SheetContentPrimitive,
  DrawerDescription as SheetDescriptionPrimitive,
  DrawerTitle as SheetTitlePrimitive,
  DrawerTrigger as SheetTriggerPrimitive,
} from "@ui-sdk/react/drawer";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

// ui-sdk's Drawer: it places the sheet on its side and slides it, so the
// classes here give it only a size and a surface.
const Sheet = ({
  side = "right",
  ...props
}: React.ComponentProps<typeof SheetPrimitive>) => (
  <SheetPrimitive side={side} {...props} />
);

const SheetTrigger = (
  props: React.ComponentProps<typeof SheetTriggerPrimitive>
) => <SheetTriggerPrimitive data-slot="sheet-trigger" {...props} />;

const SheetClose = (
  props: React.ComponentProps<typeof SheetClosePrimitive>
) => <SheetClosePrimitive {...props} />;

const SheetOverlay = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SheetBackdropPrimitive>>) => (
  <SheetBackdropPrimitive
    className={cn(
      "bg-black/10 supports-backdrop-filter:backdrop-blur-xs",
      className
    )}
    {...props}
  />
);

const SheetContent = ({
  className,
  children,
  closeLabel,
  ...props
}: Omit<
  WithClassName<React.ComponentProps<typeof SheetContentPrimitive>>,
  "children"
> & {
  readonly children?: React.ReactNode;
  /**
   * The name of the close button in the corner, in the reader's language.
   * Without one, the sheet has no such button.
   */
  readonly closeLabel?: string | undefined;
}) => (
  <>
    <SheetOverlay />
    <SheetContentPrimitive
      className={cn(
        "bg-popover text-popover-foreground flex flex-col gap-4 bg-clip-padding text-sm shadow-lg data-[side=bottom]:h-auto data-[side=bottom]:w-full data-[side=bottom]:border-t data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=top]:h-auto data-[side=top]:w-full data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
      {closeLabel === undefined ? null : (
        <SheetClosePrimitive
          render={
            <Button
              variant="ghost"
              className="absolute top-3 right-3"
              size="icon-sm"
            />
          }
        >
          <XIcon />
          <span className="sr-only">{closeLabel}</span>
        </SheetClosePrimitive>
      )}
    </SheetContentPrimitive>
  </>
);

const SheetHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-header"
    className={cn("flex flex-col gap-0.5 p-4", className)}
    {...props}
  />
);

const SheetFooter = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="sheet-footer"
    className={cn("mt-auto flex flex-col gap-2 p-4", className)}
    {...props}
  />
);

const SheetTitle = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SheetTitlePrimitive>>) => (
  <SheetTitlePrimitive
    className={cn(
      "font-heading text-foreground text-base font-medium",
      className
    )}
    {...props}
  />
);

const SheetDescription = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof SheetDescriptionPrimitive>>) => (
  <SheetDescriptionPrimitive
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
);

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
