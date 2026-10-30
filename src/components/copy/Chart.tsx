import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
export function PnlChart({
  data,
  large = false,
}: {
  data: { day: number; value: number }[];
  large?: boolean;
}) {
  return (
    <div
      className={large ? "h-72 w-full" : "h-24 w-full"}
      role="img"
      aria-label="Cumulative profit chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          {large && (
            <>
              <XAxis
                dataKey="day"
                stroke="var(--muted-foreground)"
                tickLine={false}
                axisLine={false}
              />
              <YAxis stroke="var(--muted-foreground)" tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--card)",
                  borderColor: "var(--border)",
                  borderRadius: 12,
                }}
              />
            </>
          )}
          <Line
            dataKey="value"
            type="monotone"
            stroke="var(--up)"
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
