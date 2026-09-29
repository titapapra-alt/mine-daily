"use client";

import { Eye, EyeOff, Save } from "lucide-react";
import { useState } from "react";
import { useFormStatus } from "react-dom";
import { updatePassword } from "./actions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return <button className="button button-dark justify-center" type="submit" disabled={pending}><Save size={18} aria-hidden="true" />{pending ? "Updating..." : "Reset password"}</button>;
}

function PasswordField({ label, name, autoFocus = false }: { label: string; name: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return <label className="field"><span>{label}</span><span className="password-input-wrap"><input name={name} type={visible ? "text" : "password"} minLength={8} maxLength={128} required autoComplete="new-password" autoFocus={autoFocus} /><button className="password-visibility" type="button" aria-label={visible ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`} aria-pressed={visible} onClick={() => setVisible((value) => !value)}>{visible ? <EyeOff size={19} aria-hidden="true" /> : <Eye size={19} aria-hidden="true" />}</button></span></label>;
}

export function ResetPasswordForm({ error }: { error?: string }) {
  return <form action={updatePassword} className="reset-form">
    {error && <p className="notice" role="alert">{error}</p>}
    <PasswordField label="New password" name="password" autoFocus />
    <PasswordField label="Confirm new password" name="confirmation" />
    <p className="reset-hint">Use 8-128 characters. Both entries must match.</p>
    <SubmitButton />
  </form>;
}
