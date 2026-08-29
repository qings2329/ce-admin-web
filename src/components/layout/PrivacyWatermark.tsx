import { useEffect, useRef, useState } from "react";
import { useGlobalStore } from "../../store/useGlobalStore";
import { useI18n } from "../../i18n";
import { api } from "../../api/client";

// ─── 防旁观模式：Canvas 全局半透明动态水印 ────────────────────────────────────
// 显示 管理员姓名 + 登录IP + 实时时间戳，平铺斜向铺满整个视口。
export function PrivacyWatermark() {
  const privacyMode = useGlobalStore((s: { privacyMode: boolean }) => s.privacyMode);
  const { t } = useI18n();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [info, setInfo] = useState<{ name: string; ip: string }>({
    name: "",
    ip: window.location.hostname || "",
  });

  useEffect(() => {
    if (!privacyMode) return;
    let alive = true;
    api
      .me()
      .then((me: any) => {
        if (alive) {
          setInfo({
            name: me?.username ?? me?.name ?? "",
            ip: me?.client_ip || me?.ip || window.location.hostname,
          });
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [privacyMode]);

  useEffect(() => {
    if (!privacyMode) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    let raf = 0;
    const draw = () => {
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);
      const name = info.name || "admin";
      const ip = info.ip || window.location.hostname;
      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, "0");
      const ts = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
      const text = `${t("privacy.watermark")} · ${name} · ${ip} · ${ts}`;

      ctx.save();
      ctx.translate(w / 2, h / 2);
      ctx.rotate((-20 * Math.PI) / 180);
      ctx.font = "14px sans-serif";
      ctx.fillStyle = "rgba(244, 63, 94, 0.12)";
      ctx.textAlign = "center";

      const stepX = 260;
      const stepY = 90;
      const halfW = Math.ceil(w / 2 / stepX) + 2;
      const halfH = Math.ceil(h / 2 / stepY) + 2;
      for (let i = -halfH; i <= halfH; i++) {
        for (let j = -halfW; j <= halfW; j++) {
          ctx.fillText(text, j * stepX, i * stepY);
        }
      }
      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(raf);
    };
    // 时间戳实时刷新由 rAF 驱动；水印文案变化时重绘
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [privacyMode, info.name, info.ip, t]);

  if (!privacyMode) return null;

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-[70] h-full w-full"
      aria-hidden="true"
    />
  );
}
