/**
 * Shared Recharts styling so every chart in the app looks like one system.
 * Colours are CSS variables, so charts follow light/dark automatically.
 *
 *   <CartesianGrid {...chartGrid} />
 *   <XAxis {...chartAxis} dataKey="month" />
 *   <YAxis {...chartAxis} width={48} />
 *   <Bar {...chartBar} dataKey="income" fill={chartColors.income} />
 */

export const chartColors = {
  income: "var(--chart-income)",
  expense: "var(--chart-expense)",
  primary: "var(--chart-1)",
  /** Categorical palette for series without their own colour. */
  series: [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ],
  grid: "var(--border)",
  axis: "var(--muted-foreground)",
  cursor: "var(--surface-2)",
} as const;

/** Horizontal guide lines only, dashed and subtle. */
export const chartGrid = {
  vertical: false,
  stroke: chartColors.grid,
  strokeDasharray: "3 4",
} as const;

/** Axis without lines, small muted ticks. */
export const chartAxis = {
  axisLine: false,
  tickLine: false,
  tickMargin: 8,
  tick: { fill: chartColors.axis, fontSize: 12 },
} as const;

/** Rounded-top bars that grow in on mount. */
export const chartBar = {
  radius: [6, 6, 2, 2] as [number, number, number, number],
  maxBarSize: 18,
  animationDuration: 700,
  animationEasing: "ease-out" as const,
};

/** Donut defaults: thin ring, rounded segment ends, small gaps. */
export const chartDonut = {
  innerRadius: "68%",
  outerRadius: "100%",
  paddingAngle: 2,
  cornerRadius: 6,
  stroke: "none",
  animationDuration: 700,
} as const;

/** Hover band behind the active bar group. */
export const chartCursor = { fill: chartColors.cursor, radius: 8 } as const;

export const chartLine = {
  strokeWidth: 2.5,
  dot: false,
  activeDot: { r: 5, strokeWidth: 0 },
  animationDuration: 700,
} as const;
