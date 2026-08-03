import Link from "next/link";
import { Broadcast } from "@phosphor-icons/react/dist/ssr";
import { cn } from "@/lib/utils";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link
      href="/"
      className="group inline-flex items-center gap-2.5 rounded-lg text-foreground"
      aria-label="校招雷达首页"
    >
      <span className="brand-mark">
        <Broadcast size={19} weight="duotone" aria-hidden="true" />
      </span>
      <span
        className={cn(
          "font-semibold tracking-[-0.03em]",
          compact ? "hidden sm:inline" : "text-lg",
        )}
      >
        校招雷达
      </span>
    </Link>
  );
}
