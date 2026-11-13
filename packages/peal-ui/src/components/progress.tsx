"use client";

import {
  Progress as ProgressPrimitive,
  ProgressIndicator as ProgressIndicatorPrimitive,
  ProgressLabel as ProgressLabelPrimitive,
  ProgressTrack as ProgressTrackPrimitive,
  ProgressValue as ProgressValuePrimitive,
} from "@ui-sdk/react/progress";
import type * as React from "react";

import { cn } from "../lib/utils";

type WithClassName<Props> = Omit<Props, "className"> & {
  readonly className?: string | undefined;
};

const ProgressTrack = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof ProgressTrackPrimitive>>) => (
  <ProgressTrackPrimitive
    className={cn(
      "bg-muted relative flex h-1 w-full items-center overflow-x-hidden rounded-full",
      className
    )}
    data-slot="progress-track"
    {...props}
  />
);

const ProgressIndicator = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof ProgressIndicatorPrimitive>>) => (
  <ProgressIndicatorPrimitive
    data-slot="progress-indicator"
    className={cn("bg-primary h-full transition-all", className)}
    {...props}
  />
);

const Progress = ({
  className,
  children,
  ...props
}: Omit<
  WithClassName<React.ComponentProps<typeof ProgressPrimitive>>,
  "children"
> & {
  readonly children?: React.ReactNode;
}) => (
  <ProgressPrimitive
    data-slot="progress"
    className={cn("flex flex-wrap gap-3", className)}
    {...props}
  >
    {children}
    <ProgressTrack>
      <ProgressIndicator />
    </ProgressTrack>
  </ProgressPrimitive>
);

const ProgressLabel = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof ProgressLabelPrimitive>>) => (
  <ProgressLabelPrimitive
    className={cn("text-sm font-medium", className)}
    data-slot="progress-label"
    {...props}
  />
);

const ProgressValue = ({
  className,
  ...props
}: WithClassName<React.ComponentProps<typeof ProgressValuePrimitive>>) => (
  <ProgressValuePrimitive
    className={cn(
      "text-muted-foreground ml-auto text-sm tabular-nums",
      className
    )}
    data-slot="progress-value"
    {...props}
  />
);

export {
  Progress,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
};
