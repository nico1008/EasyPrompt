import type { ReactNode } from "react";

export function DetailActions({
  primary,
  secondary,
  providers,
}: {
  primary: ReactNode;
  secondary?: ReactNode;
  providers?: ReactNode;
}) {
  return (
    <div className="pd-actions">
      <div className="pd-action-main">
        {primary}
        {secondary}
      </div>
      {providers && <div className="pd-action-providers">{providers}</div>}
    </div>
  );
}
