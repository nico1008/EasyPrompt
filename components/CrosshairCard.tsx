import type { ComponentPropsWithoutRef, CSSProperties, ElementType, ReactNode } from "react";

/* The signature element (DESIGN_GUIDELINES §4): a crosshair card always carries
   its two bottom-corner tick spans. This wrapper guarantees they're never
   omitted. Pass extra class names (e.g. "card popular") via `className`. Any
   other props (href, onKeyDown, …) are forwarded to the underlying element. */
type CrosshairCardProps = {
  as?: ElementType;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
} & Omit<ComponentPropsWithoutRef<"div">, "className" | "style" | "children">;

export function CrosshairCard({
  as: Tag = "div",
  className = "",
  style,
  children,
  ...rest
}: CrosshairCardProps) {
  return (
    <Tag className={`crosshair ${className}`.trim()} style={style} {...rest}>
      <span className="ch-bl" />
      <span className="ch-br" />
      {children}
    </Tag>
  );
}
