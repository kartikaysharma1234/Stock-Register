import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../../utils/cn";
import type { ChartDatum } from "./AreaChart";

interface LineChartProps {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  color?: string;
  className?: string;
}

export const LineChart = ({
  data,
  xKey,
  yKey,
  color = "#4F46E5",
  className,
}: LineChartProps) => (
  <div className={cn("h-72", className)}>
    <ResponsiveContainer height="100%" width="100%">
      <RechartsLineChart data={data}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} />
        <Tooltip />
        <Line dataKey={yKey} dot={false} stroke={color} strokeWidth={2} />
      </RechartsLineChart>
    </ResponsiveContainer>
  </div>
);
