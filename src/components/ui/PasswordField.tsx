import { useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

interface PasswordFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  strengthLabel?: string;
  showStrength?: boolean;
  getStrengthText?: (level: number) => string;
}

export function PasswordField({ className, label, showStrength = true, getStrengthText, ...props }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const [strength, setStrength] = useState(0);

  const val = (props.value as string) ?? "";
  const pct = (() => {
    let s = 0;
    if (val.length >= 6) s++;
    if (val.length >= 10) s++;
    if (/[A-Z]/.test(val)) s++;
    if (/[0-9]/.test(val)) s++;
    if (/[^A-Za-z0-9]/.test(val)) s++;
    return Math.min(5, s);
  })();
  if (showStrength && pct !== strength) setStrength(pct);

  const strengthLabel = () => {
    if (pct === 0) return "";
    if (getStrengthText) return getStrengthText(pct);
    if (pct <= 2) return "弱";
    if (pct <= 3) return "中";
    return "强";
  };

  const barColor = pct <= 2 ? "bg-destructive" : pct <= 3 ? "bg-warning" : "bg-success";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <label className="text-xs text-muted-foreground">{label}</label>}
      <div className="relative">
        <Input type={visible ? "text" : "password"} {...props} className="pr-10" />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
        </button>
      </div>
      {showStrength && val.length > 0 && (
        <div className="space-y-1">
          <div className="flex gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i < pct ? barColor : "bg-muted",
                )}
              />
            ))}
          </div>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Lock className="h-2.5 w-2.5" />
            {strengthLabel()}
          </span>
        </div>
      )}
    </div>
  );
}

