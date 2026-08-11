import Link from "next/link";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg text-foreground"
      aria-label="校招雷达首页"
    >
      <span className="brand-mark" aria-hidden="true">
        <span className="brand-signal" />
      </span>
      <span
        className={cn(
          "brand-wordmark font-semibold",
          compact ? "hidden sm:inline" : "text-lg",
        )}
      >
        校招雷达
      </span>
    </Link>
  );
}
