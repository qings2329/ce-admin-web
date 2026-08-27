import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

// Shadcn 约定工具：合并 className，后者覆盖前者冲突的工具类。
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
