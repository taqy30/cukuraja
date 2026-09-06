import Link from "next/link";
import { Scissors } from "lucide-react";
import { BRAND_NAME_HTML, SHOP_PATH } from "@/lib/brand";
import { cn } from "@/lib/utils";

type Props = {
  href?: string | null;
  className?: string;
  withIcon?: boolean;
  iconClassName?: string;
  size?: "sm" | "md" | "lg";
  inverse?: boolean;
  onClick?: React.MouseEventHandler<HTMLAnchorElement>;
};

const TEXT: Record<NonNullable<Props["size"]>, string> = {
  sm: "text-base",
  md: "text-lg",
  lg: "text-2xl",
};

const ICON_WRAP: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-8 w-8 rounded-lg",
  md: "h-9 w-9 rounded-lg",
  lg: "h-10 w-10 rounded-xl",
};

const ICON: Record<NonNullable<Props["size"]>, string> = {
  sm: "h-4 w-4",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

/** Logo teks brand Cukuraja. */
export function BrandMark({
  href = SHOP_PATH,
  className,
  withIcon = true,
  iconClassName,
  size = "md",
  inverse = false,
  onClick,
}: Props) {
  const content = (
    <>
      {withIcon && (
        <span
          className={cn(
            "flex items-center justify-center bg-primary text-primary-foreground",
            ICON_WRAP[size],
            iconClassName
          )}
        >
          <Scissors className={ICON[size]} aria-hidden />
        </span>
      )}
      <span
        className={cn(
          "font-heading font-bold tracking-tight",
          inverse ? "text-white" : "text-foreground",
          TEXT[size]
        )}
      >
        {BRAND_NAME_HTML.prefix}
        <span className={inverse ? "text-white/80" : "text-primary"}>
          {BRAND_NAME_HTML.accent}
        </span>
      </span>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        onClick={onClick}
        className={cn("inline-flex items-center gap-2.5", className)}
      >
        {content}
      </Link>
    );
  }

  return <span className={cn("inline-flex items-center gap-2.5", className)}>{content}</span>;
}
