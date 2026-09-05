import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import EChartsReact from "echarts-for-react";
import { useState } from "react";
import { useI18n } from "../../i18n";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Button } from "../ui/button";
import { RefreshCw } from "lucide-react";

echarts.use([CanvasRenderer]);

interface FundFlowProps {
  time: string[];
  deposit: number[];
  withdrawal: number[];
  spikes: { idx: number; ts: string; labelKey: string }[];
  truncated?: boolean;
}

interface FundFlowChartProps {
  data?: FundFlowProps;
  onSpikeClick?: (spike: { idx: number; ts: string; labelKey: string; deposit: number; withdrawal: number }) => void;
}

export function FundFlowChart({ data, onSpikeClick }: FundFlowChartProps) {
  const { t } = useI18n();
  const [activeSpike, setActiveSpike] = useState<number | null>(null);
  const empty = data && data.time.length > 0 ? false : true;
  const flowData = empty ? { time: [], deposit: [], withdrawal: [], spikes: [] } : data!;

  const handleSpikeClick = (params: any) => {
    if (params.componentType === "markPoint") {
      const idx = params.dataIndex;
      setActiveSpike(idx);
      const spike = flowData.spikes.find((s) => s.idx === idx) ?? flowData.spikes[flowData.spikes.length - 1];
      if (spike) {
        onSpikeClick?.({
          idx: spike.idx,
          ts: spike.ts,
          labelKey: spike.labelKey,
          deposit: flowData.deposit[spike.idx],
          withdrawal: flowData.withdrawal[spike.idx],
        });
      }
    }
  };

  const markPointData = activeSpike !== null
    ? [{ coord: [activeSpike, flowData.withdrawal[activeSpike]], name: "!" }]
    : [];

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "cross" },
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--border))",
      textStyle: { color: "hsl(var(--foreground))", fontSize: 12 },
      formatter: (params: any) => {
        const p = Array.isArray(params) ? params : [params];
        const idx = p[0]?.dataIndex;
        const timeLabel = flowData.time[idx] ?? "";
        let html = `<div style="font-weight:600;margin-bottom:4px">${timeLabel}</div>`;
        p.forEach((item: any) => {
          html += `<div style="display:flex;align-items:center;gap:4px">
            <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${item.color}"></span>
            <span>${item.seriesName}: </span>
            <span style="font-weight:600">$${item.value?.toLocaleString() ?? "-"}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: [t("riskdash.chart.deposit"), t("riskdash.chart.withdrawal")],
      top: 4,
      right: 10,
      textStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11 },
    },
    grid: { left: 10, right: 10, top: 40, bottom: 36, containLabel: false },
    xAxis: {
      type: "category",
      data: flowData.time,
      axisLine: { lineStyle: { color: "hsl(var(--border))" } },
      axisLabel: { color: "hsl(var(--muted-foreground))", fontSize: 10, interval: 23 },
      splitLine: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: { color: "hsl(var(--muted-foreground))", fontSize: 10, formatter: (v: number) => `$${(v / 1000).toFixed(0)}k` },
      splitLine: { lineStyle: { color: "hsl(var(--border))", type: "dashed" } },
      axisLine: { show: false },
    },
    dataZoom: [
      { type: "inside", start: 0, end: 100 },
      { type: "slider", start: 0, end: 100, height: 16, bottom: 4,
        borderColor: "hsl(var(--border))",
        textStyle: { color: "hsl(var(--muted-foreground))", fontSize: 10 },
        handleStyle: { color: "hsl(var(--primary))" },
      },
    ],
    series: [
      {
        name: t("riskdash.chart.deposit"),
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1.5, color: "#0ECB81" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(14,203,129,0.25)" }, { offset: 1, color: "rgba(14,203,129,0.02)" }] } },
        data: flowData.deposit,
      },
      {
        name: t("riskdash.chart.withdrawal"),
        type: "line",
        smooth: true,
        symbol: "none",
        lineStyle: { width: 1.5, color: "#F6465D" },
        areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: "rgba(246,70,93,0.2)" }, { offset: 1, color: "rgba(246,70,93,0.02)" }] } },
        data: flowData.withdrawal,
      },
    ],
    markPoint: {
      symbol: "diamond",
      symbolSize: 12,
      label: { show: true, fontSize: 10, color: "#F6465D", formatter: "⚠" },
      itemStyle: { color: "#F6465D" },
      data: markPointData,
    },
  };

  return (
    <Card>
      <CardHeader className="pb-2 flex-row items-center justify-between">
        <CardTitle className="text-sm">{t("riskdash.chart.title")}</CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => {}}>
          <RefreshCw className="h-3.5 w-3.5" />
        </Button>
      </CardHeader>
      <CardContent className="pt-0">
        {empty ? (
          <div className="flex h-[220px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="text-2xl">—</span>
            {t("riskdash.chart.noDepositData")}
          </div>
        ) : (
          <>
            <EChartsReact
              option={option}
              style={{ height: 220 }}
              onEvents={{ click: handleSpikeClick }}
            />
            <p className="text-[11px] text-muted-foreground mt-1">{t("riskdash.chart.hint")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
