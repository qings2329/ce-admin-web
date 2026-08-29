import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "./button";

export function CopyButton({ value, className }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  };
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={copy}
      title={copied ? "已复制" : "复制"}
      className={className}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  );
}
