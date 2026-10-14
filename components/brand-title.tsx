import { cn } from "cn";
import Image from "next/image";

export default function BrandTitle({ className }: { className?: string }) {
  return (
    <div className={cn("group", className)}>
      <Image
        src="/images/logo.webp"
        width={100}
        height={100}
        alt="Логотип Tuesday"
        draggable={false}
        className="size-8 rounded select-none transition-transform group-hover:-rotate-5 duration-300"
      />

      <span className="title text-lg mt-0.5 leading-none text-foreground">
        Tuesday
      </span>
    </div>
  );
}
