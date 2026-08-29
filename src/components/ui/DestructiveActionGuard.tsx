import { useState } from "react";
import { TriangleAlert, X } from "lucide-react";
import { Button } from "./button";
import { Input } from "./input";
import { useI18n } from "../../i18n";

// ─── 破坏性操作防错（Destructive Action Guard）────────────────────────────────
// 包装「删除 / 禁用 / 冻结 / 撤销 / 重置」等破坏性按钮：
// 1. 触发按钮以醒目红/警示样式呈现（红色虚线边框 + 警告图标）；
// 2. 点击后弹出确认弹窗，需手动输入指定确认文本（如 UID 或 CONFIRM）才能提交。

interface DestructiveActionGuardProps {
  trigger: React.ReactNode;
  confirmText: string;
  title?: string;
  description?: string;
  confirmLabel?: string;
  busy?: boolean;
  disabled?: boolean;
  onConfirm: () => void | Promise<void>;
}

export function DestructiveActionGuard({
  trigger,
  confirmText,
  title,
  description,
  confirmLabel,
  busy,
  disabled,
  onConfirm,
}: DestructiveActionGuardProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setText("");
    setError(null);
  };

  const handleOpen = () => {
    if (disabled) return;
    reset();
    setOpen(true);
  };

  const handleConfirm = async () => {
    if (text.trim() !== confirmText) {
      setError(t("guard.mismatch", { text: confirmText }));
      return;
    }
    setError(null);
    try {
      await onConfirm();
      setOpen(false);
      reset();
    } catch (e: any) {
      setError(e?.message ?? t("common.opFailed"));
    }
  };

  return (
    <>
      {/* 红色虚线触发按钮：触发时作为遮罩以捕获点击，同时自身仍可点 */}
      <span
        className="daa-trigger inline-block cursor-pointer"
        onClick={handleOpen}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleOpen()}
      >
        {trigger}
      </span>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md rounded-lg border-2 border-dashed border-destructive bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-destructive">
                  <TriangleAlert className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {title ?? t("guard.title")}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description ?? t("guard.description")}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-4 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
              <p className="text-muted-foreground">{t("guard.typeToConfirm")}</p>
              <p className="mt-1 font-mono font-semibold text-destructive">
                {confirmText}
              </p>
            </div>

            <Input
              autoFocus
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setError(null);
              }}
              placeholder={t("guard.inputPlaceholder")}
              className="mt-3 border-destructive/50 focus-visible:ring-destructive"
              onKeyDown={(e) => e.key === "Enter" && handleConfirm()}
            />

            {error && (
              <p className="mt-2 text-xs text-destructive">{error}</p>
            )}

            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)}>
                {t("common.cancel")}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={busy || text.trim() !== confirmText}
                onClick={handleConfirm}
              >
                {busy ? t("common.loading") : confirmLabel ?? t("guard.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
