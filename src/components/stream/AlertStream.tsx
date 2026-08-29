import { useEffect, useRef, useState } from "react";
import { useI18n } from "../../i18n";
import { formatDateTime } from "../../lib/timezone";
import { cn } from "../../lib/utils";
import { Badge } from "../ui/badge";
import { StatusBadge } from "../ui/status-badge";
import { Button } from "../ui/button";
import { UserX, CheckCircle2, BellOff, Volume2, Pause, Play } from "lucide-react";
import type { RiskAlert } from "../../pages/RiskDashboard";

// ─── 告警音效（Web Audio API 合成）─────────────────────────────────────────────
const audioCtxRef = { current: null as AudioContext | null };
function getAudioCtx(): AudioContext {
  if (!audioCtxRef.current) {
    audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioCtxRef.current;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine") {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch { /* ignore */ }
}

function playAlertSound(level: "critical" | "warning" | "info", muted: boolean) {
  if (muted) return;
  if (level === "critical") {
    playTone(880, 0.15, "square");
    setTimeout(() => playTone(660, 0.15, "square"), 150);
    setTimeout(() => playTone(880, 0.25, "square"), 300);
  } else if (level === "warning") {
    playTone(660, 0.2, "sine");
    setTimeout(() => playTone(440, 0.25, "sine"), 200);
  } else {
    playTone(523, 0.12, "sine");
  }
}

// ─── 瀑布流单条告警 ────────────────────────────────────────────────────────────
function StreamAlertCard({
  alert,
  onFreeze,
  onIgnore,
}: {
  alert: RiskAlert;
  onFreeze: (uid: number) => void;
  onIgnore: (id: string) => void;
}) {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);
  const [frozen, setFrozen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 40);
    return () => clearTimeout(timer);
  }, []);

  const levelBorderMap: Record<string, string> = {
    critical: "border-l-destructive bg-destructive/8",
    warning: "border-l-warning bg-warning/6",
    info: "border-l-info bg-info/4",
  };
  const levelToneMap: Record<string, "danger" | "warning" | "info"> = {
    critical: "danger",
    warning: "warning",
    info: "info",
  };
  const borderCls = levelBorderMap[alert.level] ?? levelBorderMap.info;
  const tone = levelToneMap[alert.level] ?? "info";

  return (
    <div
      className={cn(
        "rounded-md border border-border border-l-4 bg-card p-2.5 transition-all duration-300",
        borderCls,
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2",
        frozen && "opacity-40 grayscale",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <StatusBadge tone={tone}>{t(`riskdash.level.${alert.level}`)}</StatusBadge>
          <span className="text-[10px] text-muted-foreground num">{formatDateTime(alert.occurred_at)}</span>
        </div>
        {alert.handled && (
          <Badge variant="secondary" className="text-[9px]">{t("riskdash.handled")}</Badge>
        )}
      </div>
      <p className="text-xs font-semibold mt-1 leading-tight truncate">{t(alert.titleKey)}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{t(alert.descKey)}</p>
      <div className="flex items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground num">
        {alert.user_id && <span>UID <span className="text-foreground">{alert.user_id}</span></span>}
        {alert.amount && <span>{alert.coin ?? "USDT"} <span className="text-foreground font-medium">{alert.amount.toLocaleString()}</span></span>}
        {alert.ip && <span className="truncate max-w-[100px]">{alert.ip}</span>}
      </div>
      {!frozen && (
        <div className="flex items-center gap-1 mt-1.5">
          {alert.user_id && (
            <Button
              variant="ghost"
              size="sm"
              className="h-5 px-1.5 text-[10px] text-destructive hover:bg-destructive/10"
              onClick={() => onFreeze(alert.user_id!)}
            >
              <UserX className="h-3 w-3 mr-0.5" />
              {t("riskdash.stream.freeze")}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-[10px] text-success hover:bg-success/10 ml-auto"
            onClick={() => { onIgnore(alert.id); setFrozen(true); }}
          >
            <CheckCircle2 className="h-3 w-3 mr-0.5" />
            {t("riskdash.stream.ignore")}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── 瀑布流容器 ────────────────────────────────────────────────────────────────
interface AlertStreamProps {
  alerts: RiskAlert[];
  onFreeze: (uid: number) => void;
  onIgnore: (id: string) => void;
}

export function AlertStream({ alerts, onFreeze, onIgnore }: AlertStreamProps) {
  const { t } = useI18n();
  const [muted, setMuted] = useState(false);
  const [paused, setPaused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const prevLength = useRef(alerts.length);

  useEffect(() => {
    if (alerts.length > prevLength.current) {
      const newest = alerts[0];
      playAlertSound(newest.level, muted);
    }
    prevLength.current = alerts.length;
  }, [alerts.length, muted]);

  useEffect(() => {
    if (paused || !containerRef.current) return;
    const el = containerRef.current;
    el.scrollTop = 0;
  }, [alerts.length, paused]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 mb-2">
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setMuted(!muted)} title={muted ? t("riskdash.stream.unmute") : t("riskdash.stream.mute")}>
          {muted ? <BellOff className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setPaused(!paused)} title={paused ? t("riskdash.stream.resume") : t("riskdash.stream.pause")}>
          {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
        </Button>
        <span className={cn("text-[10px] ml-auto", muted ? "text-muted-foreground" : "text-success")}>
          {muted ? "🔇" : "🔊"} {alerts.length} {t("riskdash.stream.alerts")}
        </span>
      </div>
      <div
        ref={containerRef}
        className={cn("flex-1 overflow-y-auto space-y-1.5 scrollbar-thin", paused && "pointer-events-none opacity-60")}
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {alerts.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">{t("riskdash.stream.empty")}</div>
        ) : (
          alerts.map((alert) => (
            <StreamAlertCard key={alert.id} alert={alert} onFreeze={onFreeze} onIgnore={onIgnore} />
          ))
        )}
      </div>
    </div>
  );
}
