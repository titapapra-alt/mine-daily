"use client";

import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { requestPasswordReset, signIn } from "./actions";

function SubmitButton({ configured }: { configured: boolean }) {
  const { pending } = useFormStatus();
  return <button className="button button-dark justify-center" disabled={!configured || pending}><LockKeyhole size={18} />{pending ? "Please wait…" : "Sign in"}</button>;
}

export function LoginForm({ configured, error, message }: { configured: boolean; error?: string; message?: string }) {
  const [showPassword, setShowPassword] = useState(false);
  const passwordType = showPassword ? "text" : "password";

  return <div className="grid gap-4 text-left">
    {error && <p className="notice" role="alert">{error}</p>}
    {message && <p className="notice">{message}</p>}
    <form action={signIn} className="grid gap-4">
      <label className="field">
        <span>Password</span>
        <span className="password-input-wrap">
          <input name="password" type={passwordType} maxLength={128} required autoComplete="current-password" autoFocus />
          <button className="password-visibility" type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((visible) => !visible)}>
            {showPassword ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}
          </button>
        </span>
      </label>
      <SubmitButton configured={configured} />
    </form>
    <form action={requestPasswordReset}><button className="button button-quiet w-full justify-center" type="submit">Reset owner password</button></form>
  </div>;
}
