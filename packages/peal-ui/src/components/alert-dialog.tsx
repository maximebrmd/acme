"use client";

import {
  AlertDialog as AlertDialogPrimitive,
  AlertDialogBackdrop as AlertDialogBackdropPrimitive,
  AlertDialogClose as AlertDialogClosePrimitive,
  AlertDialogContent as AlertDialogContentPrimitive,
  AlertDialogDescription as AlertDialogDescriptionPrimitive,
  AlertDialogTitle as AlertDialogTitlePrimitive,
  AlertDialogTrigger as AlertDialogTriggerPrimitive,
} from "@ui-sdk/react/alert-dialog";
import type * as React from "react";

import { cn } from "../lib/utils";
import { Button } from "./button";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

const AlertDialog = (
  props: React.ComponentProps<typeof AlertDialogPrimitive>
) => <AlertDialogPrimitive {...props} />;

const AlertDialogTrigger = (
  props: React.ComponentProps<typeof AlertDialogTriggerPrimitive>
) => <AlertDialogTriggerPrimitive {...props} />;

const AlertDialogOverlay = ({
  className,
  ...props
}: WithClassName<
  React.ComponentProps<typeof AlertDialogBackdropPrimitive>
>) => (
  <AlertDialogBackdropPrimitive
    className={cn(
      "fixed inset-0 isolate z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs",
      className
    )}
    {...props}
  />
);

const AlertDialogContent = ({
  className,
  size = "default",
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogContentPrimitive>> & {
  readonly size?: "default" | "sm";
}) => (
  <>
    <AlertDialogOverlay />
    <AlertDialogContentPrimitive
      data-size={size}
      className={cn(
        "group/alert-dialog-content bg-popover text-popover-foreground ring-foreground/10 fixed top-1/2 left-1/2 z-50 grid w-full -translate-x-1/2 -translate-y-1/2 gap-4 rounded-xl p-4 ring-1 transition-[opacity,scale] duration-150 outline-none data-ending-style:scale-95 data-ending-style:opacity-0 data-starting-style:scale-95 data-starting-style:opacity-0 data-[size=default]:max-w-xs data-[size=sm]:max-w-xs data-[size=default]:sm:max-w-sm",
        className
      )}
      {...props}
    />
  </>
);

const AlertDialogHeader = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-dialog-header"
    className={cn(
      "grid grid-rows-[auto_1fr] place-items-center gap-1.5 text-center has-data-[slot=alert-dialog-media]:grid-rows-[auto_auto_1fr] has-data-[slot=alert-dialog-media]:gap-x-4 sm:group-data-[size=default]/alert-dialog-content:place-items-start sm:group-data-[size=default]/alert-dialog-content:text-left sm:group-data-[size=default]/alert-dialog-content:has-data-[slot=alert-dialog-media]:grid-rows-[auto_1fr]",
      className
    )}
    {...props}
  />
);

const AlertDialogFooter = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-dialog-footer"
    className={cn(
      "bg-muted/50 -mx-4 -mb-4 flex flex-col-reverse gap-2 rounded-b-xl border-t p-4 group-data-[size=sm]/alert-dialog-content:grid group-data-[size=sm]/alert-dialog-content:grid-cols-2 sm:flex-row sm:justify-end",
      className
    )}
    {...props}
  />
);

const AlertDialogMedia = ({
  className,
  ...props
}: React.ComponentProps<"div">) => (
  <div
    data-slot="alert-dialog-media"
    className={cn(
      "bg-muted mb-2 inline-flex size-10 items-center justify-center rounded-md sm:group-data-[size=default]/alert-dialog-content:row-span-2 *:[svg:not([class*='size-'])]:size-6",
      className
    )}
    {...props}
  />
);

const AlertDialogTitle = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogTitlePrimitive>>) => (
  <AlertDialogTitlePrimitive
    className={cn(
      "font-heading text-base font-medium sm:group-data-[size=default]/alert-dialog-content:group-has-data-[slot=alert-dialog-media]/alert-dialog-content:col-start-2",
      className
    )}
    {...props}
  />
);

const AlertDialogDescription = ({
  className,
  ...props
}: WithClassName<
  React.ComponentProps<typeof AlertDialogDescriptionPrimitive>
>) => (
  <AlertDialogDescriptionPrimitive
    className={cn(
      "text-muted-foreground *:[a]:hover:text-foreground text-sm text-balance md:text-pretty *:[a]:underline *:[a]:underline-offset-3",
      className
    )}
    {...props}
  />
);

const AlertDialogAction = ({
  className,
  ...props
}: React.ComponentProps<typeof Button>) => (
  <Button
    data-slot="alert-dialog-action"
    className={cn(className)}
    {...props}
  />
);

const AlertDialogCancel = ({
  className,
  variant = "outline",
  size = "default",
  ...props
}: WithClassName<React.ComponentProps<typeof AlertDialogClosePrimitive>> &
  Pick<React.ComponentProps<typeof Button>, "variant" | "size">) => (
  <AlertDialogClosePrimitive
    render={
      <Button
        data-slot="alert-dialog-cancel"
        className={cn(className)}
        variant={variant}
        size={size}
      />
    }
    {...props}
  />
);

export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogOverlay,
  AlertDialogTitle,
  AlertDialogTrigger,
};
