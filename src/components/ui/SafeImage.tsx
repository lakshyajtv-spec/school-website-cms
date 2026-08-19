import { useEffect, useState, type ImgHTMLAttributes } from "react";
import { ImageOff } from "lucide-react";
import { cn } from "@/utils/cn";

interface SafeImageProps extends ImgHTMLAttributes<HTMLImageElement> {
  fallbackLabel: string;
  fallbackClassName?: string;
}

/** Image with a stable, accessible fallback for invalid/missing URLs. */
export default function SafeImage({
  src,
  alt,
  className,
  fallbackLabel,
  fallbackClassName,
  ...props
}: SafeImageProps) {
  const [failed, setFailed] = useState(!src);

  useEffect(() => setFailed(!src), [src]);

  if (failed) {
    return (
      <div
        role={alt ? "img" : undefined}
        aria-label={alt || undefined}
        className={cn(
          "flex items-center justify-center bg-gradient-to-br from-royal-50 to-royal-100 text-royal-400",
          className,
          fallbackClassName,
        )}
      >
        <span className="flex flex-col items-center gap-2 px-3 text-center font-body text-xs">
          <ImageOff className="h-6 w-6" />
          {alt && fallbackLabel}
        </span>
      </div>
    );
  }

  return (
    <img
      {...props}
      src={src}
      alt={alt}
      className={className}
      onError={(event) => {
        props.onError?.(event);
        setFailed(true);
      }}
    />
  );
}