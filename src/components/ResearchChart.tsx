import ReactEChartsCore from "echarts-for-react/lib/core";
import * as echarts from "echarts/core";
import { BarChart, GraphChart, RadarChart } from "echarts/charts";
import { GridComponent, LegendComponent, TooltipComponent } from "echarts/components";
import { CanvasRenderer } from "echarts/renderers";

echarts.use([BarChart, GraphChart, RadarChart, GridComponent, LegendComponent, TooltipComponent, CanvasRenderer]);

interface ResearchChartProps {
  option: Record<string, unknown>;
  height?: number;
  onEvents?: Record<string, (params: never) => void>;
}

export function ResearchChart({ option, height = 400, onEvents }: ResearchChartProps) {
  return <ReactEChartsCore echarts={echarts} option={option} style={{ height }} notMerge lazyUpdate onEvents={onEvents} />;
}
