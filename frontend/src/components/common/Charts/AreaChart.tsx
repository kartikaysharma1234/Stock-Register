import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "../../../utils/cn";

export type ChartDatum = Record<string, string | number>;

interface AreaChartProps {
  data: ChartDatum[];
  xKey: string;
  yKey: string;
  color?: string;
  className?: string;
}

export const AreaChart = ({
  data,
  xKey,
  yKey,
  color = "#4F46E5",
  className,
}: AreaChartProps) => (
  <div className={cn("h-72", className)}>
    <ResponsiveContainer height="100%" width="100%">
      <RechartsAreaChart data={data}>
        <CartesianGrid stroke="#E5E7EB" strokeDasharray="3 3" />
        <XAxis dataKey={xKey} fontSize={12} tickLine={false} />
        <YAxis fontSize={12} tickLine={false} />
        <Tooltip />
        <Area dataKey={yKey} fill={color} fillOpacity={0.12} stroke={color} />
      </RechartsAreaChart>
    </ResponsiveContainer>
  </div>
);
