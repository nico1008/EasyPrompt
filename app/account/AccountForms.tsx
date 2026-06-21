"use client";

/* Account settings forms: profile (display name + username), password change,
 * and the delete-account danger zone. Profile/password use useActionState for
 * inline feedback; delete is a form action with a two-step ConfirmButton. */

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CrosshairCard } from "@/components/CrosshairCard";
import { ConfirmButton } from "@/components/ConfirmButton";
import {
  updateProfileAction,
  updatePasswordAction,
  deleteAccountAction,
} from "@/lib/auth/actions";
import type { ActionState } from "@/lib/auth/schemas";

const EMPTY: ActionState = {};

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-sm" type="submit" disabled={pending}>
      {pending ? "Saving…" : label}
    </button>
  );
}

function Feedback({ state }: { state: ActionState }) {
  if (state.error) return <p className="account-err" role="alert">{state.error}</p>;
  if (state.ok && state.message) return <p className="account-ok" role="status">{state.message}</p>;
  return null;
}

export function AccountForms({
  email,
  displayName,
  username,
  bio,
  isPublic,
}: {
  email: string;
  displayName: string;
  username: string;
  bio: string;
  isPublic: boolean;
}) {
  const [profileState, profileAction] = useActionState(updateProfileAction, EMPTY);
  const [pwState, pwAction] = useActionState(updatePasswordAction, EMPTY);

  return (
    <>
      <form action={profileAction} className="panel account-card">
        <h2>Profile</h2>
        <div className="field">
          <label htmlFor="a-email">Email</label>
          <input id="a-email" className="input" value={email} disabled readOnly />
          <span className="helper">Email changes aren&apos;t available here yet.</span>
        </div>
        <div className="field">
          <label htmlFor="a-name">Display name</label>
          <input
            id="a-name"
            name="display_name"
            className="input"
            defaultValue={displayName}
            placeholder="Your name"
            aria-invalid={profileState.fieldErrors?.display_name ? true : undefined}
            aria-describedby={profileState.fieldErrors?.display_name ? "a-name-err" : undefined}
          />
          {profileState.fieldErrors?.display_name && (
            <span id="a-name-err" className="account-err" role="alert">
              {profileState.fieldErrors.display_name[0]}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="a-user">Username</label>
          <input
            id="a-user"
            name="username"
            className="input"
            defaultValue={username}
            placeholder="username"
            aria-invalid={profileState.fieldErrors?.username ? true : undefined}
            aria-describedby={profileState.fieldErrors?.username ? "a-user-err" : undefined}
          />
          {profileState.fieldErrors?.username && (
            <span id="a-user-err" className="account-err" role="alert">
              {profileState.fieldErrors.username[0]}
            </span>
          )}
        </div>
        <div className="field">
          <label htmlFor="a-bio">Bio</label>
          <textarea
            id="a-bio"
            name="bio"
            className="input"
            rows={3}
            defaultValue={bio}
            placeholder="A short line about you (shown on your public profile)."
            aria-invalid={profileState.fieldErrors?.bio ? true : undefined}
            aria-describedby={profileState.fieldErrors?.bio ? "a-bio-err" : undefined}
          />
          {profileState.fieldErrors?.bio && (
            <span id="a-bio-err" className="account-err" role="alert">
              {profileState.fieldErrors.bio[0]}
            </span>
          )}
        </div>
        <div className="field account-toggle">
          <label htmlFor="a-public">
            <input id="a-public" name="is_public" type="checkbox" defaultChecked={isPublic} />
            Make my profile public
          </label>
          <span className="helper">
            Lists your published Prompts &amp; Templates at{" "}
            {username ? <code>/u/{username}</code> : "/u/your-username"} with your name. Off by default.
          </span>
        </div>
        <Feedback state={profileState} />
        <div>
          <SaveButton label="Save profile" />
        </div>
      </form>

      <form action={pwAction} className="panel account-card">
        <h2>Password</h2>
        <div className="field">
          <label htmlFor="a-pw">New password</label>
          <input
            id="a-pw"
            name="password"
            type="password"
            className="input"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            aria-invalid={pwState.fieldErrors?.password ? true : undefined}
            aria-describedby={pwState.fieldErrors?.password ? "a-pw-err" : undefined}
          />
          {pwState.fieldErrors?.password && (
            <span id="a-pw-err" className="account-err" role="alert">
              {pwState.fieldErrors.password[0]}
            </span>
          )}
        </div>
        <Feedback state={pwState} />
        <div>
          <SaveButton label="Update password" />
        </div>
      </form>

      <CrosshairCard className="panel account-card account-danger">
        <h2>Delete account</h2>
        <p className="muted">
          Permanently deletes your account and every template and saved prompt you
          own. This can&apos;t be undone.
        </p>
        <form action={deleteAccountAction}>
          <ConfirmButton label="Delete my account" confirmLabel="Yes, delete everything" />
        </form>
      </CrosshairCard>
    </>
  );
}
