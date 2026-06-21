import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { cn } from "../../../utils/cn";
import type { ChartDatum } from "./AreaChart";

interface DonutChartProps {
  data: ChartDatum[];
  nameKey: string;
  valueKey: string;
  colors?: string[];
  className?: string;
}

export const DonutChart = ({
  data,
  nameKey,
  valueKey,
  colors = ["#4F46E5", "#059669", "#D97706", "#DC2626", "#6B7280"],
  className,
}: DonutChartProps) => (
  <div className={cn("h-64", className)}>
    <ResponsiveContainer height="100%" width="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={valueKey}
          innerRadius="58%"
          nameKey={nameKey}
          outerRadius="82%"
          paddingAngle={2}
        >
          {data.map((entry, index) => (
            <Cell
              fill={colors[index % colors.length]}
              key={`${String(entry[nameKey])}-${index}`}
            />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  </div>
);
