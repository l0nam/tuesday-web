import { bannerSvgPaths, type Banner } from "@/lib/cities/banner";
import { cn } from "cn";

export function BannerView({
  banner,
  className,
  label = "Флаг клана",
}: {
  banner: Banner;
  className?: string;
  label?: string;
}) {
  return (
    <svg
      viewBox="0 0 20 40"
      role="img"
      aria-label={label}
      shapeRendering="crispEdges"
      className={cn(
        "aspect-1/2 shrink-0 rounded-[3px] ring-1 ring-black/40",
        className,
      )}
    >
      {bannerSvgPaths(banner).map((p) => (
        <path key={p.color} d={p.d} fill={p.color} />
      ))}
    </svg>
  );
}
