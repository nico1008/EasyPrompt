"use client";

/* Two-step submit button for destructive form actions: first click arms it,
 * second confirms. Lives inside a <form action={deleteAction}> and uses
 * useFormStatus for the pending label. Avoids native confirm() dialogs. */

import { useState } from "react";
import { useFormStatus } from "react-dom";

export function ConfirmButton({
  label = "Delete",
  confirmLabel = "Confirm delete",
}: {
  label?: string;
  confirmLabel?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();

  if (!armed) {
    return (
      <button
        type="button"
        className="btn btn-ghost btn-sm danger"
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    );
  }

  return (
    <span className="confirm-row">
      <button type="submit" className="btn btn-sm danger-solid" disabled={pending}>
        {pending ? "Deleting…" : confirmLabel}
      </button>
      <button
        type="button"
        className="btn btn-ghost btn-sm"
        onClick={() => setArmed(false)}
        disabled={pending}
      >
        Cancel
      </button>
    </span>
  );
}
