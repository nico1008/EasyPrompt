"use client";

/* Client form islands for the auth pages. One "use client" module, four forms,
 * all driven by the server actions in lib/auth/actions.ts via useActionState.
 * useFormStatus gives each submit button a pending state for free. */

import Link from "next/link";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  signInAction,
  signUpAction,
  requestPasswordResetAction,
  updatePasswordAction,
} from "@/lib/auth/actions";
import { safeAuthRedirect } from "@/lib/auth/redirects";
import { deriveUsernameFromEmail } from "@/lib/auth/usernames";
import type { ActionState } from "@/lib/auth/schemas";

const EMPTY: ActionState = {};

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="btn btn-primary btn-lg" type="submit" disabled={pending}>
      {pending ? "Working…" : children}
    </button>
  );
}

function FieldErr({ id, errs }: { id: string; errs?: string[] }) {
  if (!errs?.length) return null;
  return (
    <span id={id} className="auth-field-err" role="alert">
      {errs[0]}
    </span>
  );
}

function TopError({ error }: { error?: string }) {
  if (!error) return null;
  return (
    <p className="auth-error" role="alert">
      {error}
    </p>
  );
}

function Success({ title, body }: { title: string; body: string }) {
  return (
    <div className="auth-success" role="status">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

function SignupSuccess({ message, next }: { message: string; next: string }) {
  return (
    <div className="auth-success" role="status">
      <strong>Check your inbox</strong>
      <p>{message}</p>
      <div className="auth-success-actions">
        <Link className="btn btn-primary btn-sm" href={authHref("/login", next)}>
          Log in
        </Link>
        <Link className="btn btn-ghost btn-sm" href="/forgot-password">
          Reset password
        </Link>
        <Link href={authHref("/signup", next)}>Try another email</Link>
      </div>
    </div>
  );
}

function authHref(path: "/login" | "/signup", next?: string): string {
  return `${path}?next=${encodeURIComponent(safeAuthRedirect(next))}`;
}

/* --------------------------------- login ---------------------------------- */
export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, EMPTY);
  const nextPath = safeAuthRedirect(next);
  return (
    <form action={action} className="auth-form" noValidate>
      <TopError error={state.error} />
      <input type="hidden" name="next" value={nextPath} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-err" : undefined}
        />
        <FieldErr id="email-err" errs={state.fieldErrors?.email} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={state.fieldErrors?.password ? "password-err" : undefined}
        />
        <FieldErr id="password-err" errs={state.fieldErrors?.password} />
      </div>
      <SubmitButton>Log in</SubmitButton>
      <div className="auth-links">
        <Link href="/forgot-password">Forgot password?</Link>
        <span>
          New here? <Link href={authHref("/signup", nextPath)}>Create an account</Link>
        </span>
      </div>
    </form>
  );
}

/* --------------------------------- signup --------------------------------- */
export function SignupForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUpAction, EMPTY);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [usernameEdited, setUsernameEdited] = useState(false);
  const nextPath = safeAuthRedirect(next);
  if (state.ok && state.message) {
    return <SignupSuccess message={state.message} next={nextPath} />;
  }
  return (
    <form action={action} className="auth-form" noValidate>
      <TopError error={state.error} />
      <input type="hidden" name="next" value={nextPath} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          value={email}
          onChange={(event) => {
            const nextEmail = event.target.value;
            setEmail(nextEmail);
            if (!usernameEdited) {
              setUsername(deriveUsernameFromEmail(nextEmail));
            }
          }}
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-err" : undefined}
        />
        <FieldErr id="email-err" errs={state.fieldErrors?.email} />
      </div>
      <div className="field">
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          className="input"
          value={username}
          onChange={(event) => {
            setUsernameEdited(true);
            setUsername(event.target.value);
          }}
          autoComplete="username"
          required
          aria-invalid={state.fieldErrors?.username ? true : undefined}
          aria-describedby={
            state.fieldErrors?.username ? "username-err username-help" : "username-help"
          }
        />
        <span id="username-help" className="helper">
          Your profile will live at /username.
        </span>
        <FieldErr id="username-err" errs={state.fieldErrors?.username} />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password ? "password-err password-help" : "password-help"
          }
        />
        <span id="password-help" className="helper">At least 8 characters.</span>
        <FieldErr id="password-err" errs={state.fieldErrors?.password} />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.confirmPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirm-password-err" : undefined
          }
        />
        <FieldErr id="confirm-password-err" errs={state.fieldErrors?.confirmPassword} />
      </div>
      <SubmitButton>Create account</SubmitButton>
      <div className="auth-links">
        <span>
          Already have an account? <Link href={authHref("/login", nextPath)}>Log in</Link>
        </span>
      </div>
    </form>
  );
}

/* ----------------------------- forgot password ---------------------------- */
export function ForgotForm() {
  const [state, action] = useActionState(requestPasswordResetAction, EMPTY);
  if (state.ok && state.message) {
    return <Success title="Reset link sent" body={state.message} />;
  }
  return (
    <form action={action} className="auth-form" noValidate>
      <TopError error={state.error} />
      <div className="field">
        <label htmlFor="email">Email</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
          aria-invalid={state.fieldErrors?.email ? true : undefined}
          aria-describedby={state.fieldErrors?.email ? "email-err" : undefined}
        />
        <FieldErr id="email-err" errs={state.fieldErrors?.email} />
      </div>
      <SubmitButton>Send reset link</SubmitButton>
      <div className="auth-links">
        <Link href="/login">Back to log in</Link>
      </div>
    </form>
  );
}

/* ----------------------------- reset password ----------------------------- */
export function ResetForm() {
  const [state, action] = useActionState(updatePasswordAction, EMPTY);
  if (state.ok && state.message) {
    return (
      <div className="auth-success" role="status">
        <strong>Password updated</strong>
        <p>{state.message}</p>
        <Link className="btn btn-primary" href="/my">
          Go to my prompts →
        </Link>
      </div>
    );
  }
  return (
    <form action={action} className="auth-form" noValidate>
      <TopError error={state.error} />
      <div className="field">
        <label htmlFor="password">New password</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.password ? true : undefined}
          aria-describedby={
            state.fieldErrors?.password ? "password-err password-help" : "password-help"
          }
        />
        <span id="password-help" className="helper">At least 8 characters.</span>
        <FieldErr id="password-err" errs={state.fieldErrors?.password} />
      </div>
      <div className="field">
        <label htmlFor="confirmPassword">Confirm new password</label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          aria-invalid={state.fieldErrors?.confirmPassword ? true : undefined}
          aria-describedby={
            state.fieldErrors?.confirmPassword ? "confirm-password-err" : undefined
          }
        />
        <FieldErr id="confirm-password-err" errs={state.fieldErrors?.confirmPassword} />
      </div>
      <SubmitButton>Update password</SubmitButton>
    </form>
  );
}
