import Image from "next/image";
import { cn } from "@/lib/utils";

type BugSnapIconProps = {
  size?: number;
  className?: string;
};

export function BugSnapIcon({ size = 16, className = "" }: BugSnapIconProps) {
  return (
    <span
      className={cn("inline-flex items-center justify-center shrink-0", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/bugsnap-icon.svg"
        alt="BugSnap"
        width={size}
        height={size}
        className="shrink-0 dark:hidden"
      />
      <Image
        src="/bugsnap-icon-dark.svg"
        alt="BugSnap"
        width={size}
        height={size}
        className="shrink-0 hidden dark:inline-block"
      />
    </span>
  );
}
