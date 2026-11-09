"use client";

import { createContext, use } from "react";
import type { ComponentProps, ReactNode } from "react";
import { Legend, ResponsiveContainer, Tooltip } from "recharts";
import type {
  LegendPayload,
  TooltipContentProps,
  TooltipValueType,
} from "recharts";

import { cn } from "../lib/utils";

/**
 * What a chart draws for each series, by its data key: the label people
 * read, and its color, any CSS color such as `var(--chart-1)`, which the
 * theme sets for light and dark.
 */
export type ChartConfig = Readonly<
  Record<string, { readonly color: string; readonly label: ReactNode }>
>;

const ChartContext = createContext<ChartConfig>({});

const useChart = () => use(ChartContext);

// The series a tooltip or legend entry belongs to, by its data key.
const seriesOf = (
  config: ChartConfig,
  dataKey: string
): ChartConfig[string] | undefined => config[dataKey];

// A series' swatch reads its color from the `--swatch` custom property,
// set inline: React's style type admits custom properties from here on.
declare module "react" {
  interface CSSProperties {
    [property: `--${string}`]: string | undefined;
  }
}

const INITIAL_DIMENSION = { height: 200, width: 320 } as const;

const ChartContainer = ({
  children,
  className,
  config,
  ...props
}: ComponentProps<"div"> & {
  readonly children: ComponentProps<typeof ResponsiveContainer>["children"];
  readonly config: ChartConfig;
}) => (
  <ChartContext value={config}>
    <div
      data-slot="chart"
      className={cn(
        "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border flex aspect-video justify-center text-xs [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-hidden [&_.recharts-surface]:outline-hidden",
        className
      )}
      {...props}
    >
      <ResponsiveContainer initialDimension={INITIAL_DIMENSION}>
        {children}
      </ResponsiveContainer>
    </div>
  </ChartContext>
);

const ChartTooltip = Tooltip;

/**
 * A tooltip's content: the point's label, then each series with its
 * value. `formatLabel` and `formatValue` write them in the reader's
 * language.
 */
const ChartTooltipContent = ({
  active,
  className,
  formatLabel,
  formatValue,
  label,
  payload,
}: Partial<
  Pick<TooltipContentProps<TooltipValueType, string>, "active" | "label">
> & {
  readonly className?: string;
  readonly formatLabel?: (label: string | number | undefined) => ReactNode;
  readonly formatValue?: (value: number) => ReactNode;
  readonly payload?: TooltipContentProps<TooltipValueType, string>["payload"];
}) => {
  const config = useChart();

  if (active !== true || payload === undefined || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "border-border/50 bg-background grid min-w-32 items-start gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs shadow-xl",
        className
      )}
    >
      <div className="font-medium">
        {formatLabel === undefined ? label : formatLabel(label)}
      </div>
      <div className="grid gap-1.5">
        {payload.map((item) => {
          const series = seriesOf(config, String(item.dataKey));
          const value = Number(item.value);

          return (
            <div
              key={String(item.dataKey)}
              className="flex w-full items-center gap-2"
            >
              <span
                aria-hidden="true"
                className="size-2.5 shrink-0 rounded-[2px] bg-(--swatch)"
                style={{
                  "--swatch": series?.color ?? item.color ?? "currentColor",
                }}
              />
              <span className="text-muted-foreground flex-1">
                {series?.label ?? item.name}
              </span>
              <span className="text-foreground font-mono font-medium tabular-nums">
                {formatValue === undefined ? value : formatValue(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const ChartLegend = Legend;

/** A legend: each series' color and label, from the chart's config. */
const ChartLegendContent = ({
  className,
  payload,
}: {
  readonly className?: string;
  readonly payload?: readonly LegendPayload[];
}) => {
  const config = useChart();

  if (payload === undefined || payload.length === 0) {
    return null;
  }

  return (
    <div
      className={cn("flex items-center justify-center gap-4 pt-3", className)}
    >
      {payload.map((item) => {
        const series = seriesOf(config, String(item.dataKey));

        return (
          <div key={String(item.dataKey)} className="flex items-center gap-1.5">
            <span
              aria-hidden="true"
              className="size-2 shrink-0 rounded-[2px] bg-(--swatch)"
              style={{
                "--swatch": series?.color ?? item.color ?? "currentColor",
              }}
            />
            {series?.label ?? item.value}
          </div>
        );
      })}
    </div>
  );
};

export {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
};
