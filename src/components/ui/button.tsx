import type { ButtonHTMLAttributes } from "react";
export function Button({ className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button className={`inline-flex items-center rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition-colors hover:bg-neutral-900 focus-visible:outline focus-visible:outline-1 focus-visible:outline-neutral-500 ${className}`} {...p} />;
}
