"use client";

import { Sparkles } from "lucide-react";

export function AskAIButton({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new CustomEvent("open-simwaya-ai"))}
      className={className}
      type="button"
    >
      <Sparkles size={16} className="text-teal-500" />
      {children}
    </button>
  );
}
