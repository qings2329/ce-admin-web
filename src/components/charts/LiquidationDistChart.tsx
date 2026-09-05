import * as echarts from "echarts/core";
import { CanvasRenderer } from "echarts/renderers";
import EChartsReact from "echarts-for-react";
import { useI18n } from "../../i18n";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";
import { Badge } from "../ui/badge";

echarts.use([CanvasRenderer]);

interface LiquidationDistChartProps {
  data?: { name: string; value: number }[];
  onSymbolClick?: (symbol: string, amount: number) => void;
}

export function LiquidationDistChart({ data, onSymbolClick }: LiquidationDistChartProps) {
  const { t } = useI18n();
  const empty = data && data.length > 0 ? false : true;
  const chartData = empty ? [] : data!;

  const option = {
    backgroundColor: "transparent",
    tooltip: {
      trigger: "item",
      backgroundColor: "hsl(var(--card))",
      borderColor: "hsl(var(--border))",
      textStyle: { color: "hsl(var(--foreground))", fontSize: 12 },
      formatter: (p: any) => `${p.name}<br/>$<b>${p.value?.toLocaleString()}</b>`,
    },
    legend: {
      orient: "vertical",
      right: 8,
      top: "center",
      textStyle: { color: "hsl(var(--muted-foreground))", fontSize: 11 },
    },
    series: [
      {
        type: "pie",
        radius: ["38%", "68%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: { borderRadius: 6, borderColor: "hsl(var(--card))", borderWidth: 2 },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 13, fontWeight: "bold", color: "hsl(var(--foreground))" },
          itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: "rgba(0,0,0,0.5)" },
        },
        data: chartData,
        color: ["#F6465D", "#0ECB81", "#F0B90B", "#8B5CF6", "#3B82F6", "#6B7280"],
      },
    ],
  };

  const handleClick = (params: any) => {
    if (params.dataType === "series") {
      onSymbolClick?.(params.name, params.value);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          {t("riskdash.chart.liquidationDist")}
          <Badge variant="secondary" className="text-[10px]">{t("riskdash.chart.last24h")}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <div className="flex h-[200px] flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
            <span className="text-2xl">—</span>
            {t("riskdash.chart.noLiqData")}
          </div>
        ) : (
          <>
            <EChartsReact option={option} style={{ height: 200 }} onEvents={{ click: handleClick }} />
            <p className="text-[11px] text-muted-foreground mt-1 text-center">{t("riskdash.chart.clickDrilldown")}</p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
