"use client";

import {
  Dialog as DialogPrimitive,
  DialogBackdrop as DialogBackdropPrimitive,
  DialogClose as DialogClosePrimitive,
  DialogContent as DialogContentPrimitive,
  DialogDescription as DialogDescriptionPrimitive,
  DialogTitle as DialogTitlePrimitive,
  DialogTrigger as DialogTriggerPrimitive,
} from "@ui-sdk/react/dialog";
import { XIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

const Dialog = (props: React.ComponentProps<typeof DialogPrimitive>) => (
  <DialogPrimitive {...props} />
);

const DialogTrigger = (
  props: React.ComponentProps<typeof DialogTriggerPrimitive>
) => <DialogTriggerPrimitive {...props} />;

const DialogClose = (
  props: React.ComponentProps<typeof DialogClosePrimitive>
) => <DialogClosePrimitive {...props} />;

const DialogOverlay = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogBackdropPrimitive>>) => (
  <DialogBackdropPrimitive
    className={cn(
      "fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
      className
    )}
    {...props}
  />
);

const DialogContent = ({
  className,
  children,
  closeLabel,
  ...props
}: Omit<
  WithClassName<React.ComponentProps<typeof DialogContentPrimitive>>,
  "children"
> & {
  readonly children?: React.ReactNode;
  /**
   * The name of the close button in the corner, in the reader's language.
   * Without one, the dialog has no such button.
   */
  readonly closeLabel?: string | undefined;
}) => (
  <>
    <DialogOverlay />
    <DialogContentPrimitive
      className={cn(
        "bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 gap-4 overflow-y-auto rounded-lg p-4 text-sm ring-1 transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
      {closeLabel === undefined ? null : (
        // Laid out first (order-first) but after the content for focus, a
        // row of no height that sticks to the top: the close button stays
        // in sight while a tall dialog scrolls.
        <div className="sticky top-2 z-10 order-first -mt-2 -mb-2 h-0">
          <DialogClosePrimitive
            render={
              <Button
                variant="ghost"
                className="bg-popover absolute top-0 -right-2"
                size="icon-sm"
              />
            }
          >
            <XIcon />
            <span className="sr-only">{closeLabel}</span>
          </DialogClosePrimitive>
        </div>
      )}
    </DialogContentPrimitive>
  </>
);

const DialogHeader = ({ className, ...props }: React.ComponentProps<"div">) => (
  <div
    data-slot="dialog-header"
    className={cn("flex flex-col gap-2", className)}
    {...props}
  />
);

const DialogFooter = ({
  className,
  closeLabel,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** The text of a close button after the children, if the footer has one. */
  readonly closeLabel?: string | undefined;
}) => (
  <div
    data-slot="dialog-footer"
    className={cn(
      "bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-lg border-t p-4 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  >
    {children}
    {closeLabel === undefined ? null : (
      <DialogClosePrimitive render={<Button variant="outline" />}>
        {closeLabel}
      </DialogClosePrimitive>
    )}
  </div>
);

const DialogTitle = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogTitlePrimitive>>) => (
  <DialogTitlePrimitive
    className={cn("font-heading text-base leading-none font-medium", className)}
    {...props}
  />
);

const DialogDescription = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof DialogDescriptionPrimitive>>) => (
  <DialogDescriptionPrimitive
    className={cn(
      "text-muted-foreground *:[a]:hover:text-foreground text-sm *:[a]:underline *:[a]:underline-offset-3",
      className
    )}
    {...props}
  />
);

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogTrigger,
};
