"use client";

import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface RevenueDataPoint {
  month: string;
  revenue: number;
}

interface ProjectDataPoint {
  type: string;
  completed: number;
  running: number;
}

interface AnalyticsChartsProps {
  revenueData: RevenueDataPoint[];
  projectData: ProjectDataPoint[];
}

const revenueConfig = {
  revenue: {
    label: "Revenue",
    color: "#22c55e",
  },
} satisfies ChartConfig;

const projectConfig = {
  completed: {
    label: "Completed",
    color: "#6366f1",
  },
  running: {
    label: "Running",
    color: "#a855f7",
  },
} satisfies ChartConfig;

export function AnalyticsCharts({ revenueData, projectData }: AnalyticsChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {revenueData.length > 0 && (
        <Card className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
            <CardDescription className="text-[#A3A3A3]">Monthly revenue from recorded payments</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={revenueConfig} className="min-h-[250px] w-full">
              <LineChart accessibilityLayer data={revenueData} margin={{ top: 20, left: 12, right: 12 }}>
                <CartesianGrid vertical={false} stroke="#262626" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  stroke="#737373"
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Line
                  dataKey="revenue"
                  type="monotone"
                  stroke="var(--color-revenue)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}

      {projectData.length > 0 && (
        <Card className="bg-[#111111] border-[#262626] text-[#F5F5F5]">
          <CardHeader>
            <CardTitle>Project Velocity</CardTitle>
            <CardDescription className="text-[#A3A3A3]">Completed vs running projects by service type</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={projectConfig} className="min-h-[250px] w-full">
              <BarChart accessibilityLayer data={projectData}>
                <CartesianGrid vertical={false} stroke="#262626" />
                <XAxis
                  dataKey="type"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  stroke="#737373"
                />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <Bar dataKey="completed" fill="var(--color-completed)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="running" fill="var(--color-running)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
