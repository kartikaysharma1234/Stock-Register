import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../../utils/cn";
import type { ChartDatum } from "./AreaChart";

interface BarChartProps {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  color?: string;
  className?: string;
}

export const BarChart = ({
  data,
  xKey,
  yKey,
  color = "#4F46E5",
  className,
}: BarChartProps) => (
  <div className={cn("h-72", className)}>
    <ResponsiveContainer height="100%" width="100%">
      <RechartsBarChart data={data}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} />
        <Tooltip />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} />
      </RechartsBarChart>
    </ResponsiveContainer>
  </div>
);
