"use client";

import { useState } from "react";
import Illustration from "../../components/Illustration";
import { useRouter } from "../../../i18n/navigation";
import Header from "../../components/Header";
import { useToast } from "../../components/Toast";
import { api, ApiError } from "../../lib/api";
import { endSession } from "../../lib/store";
import { useT } from "../../../i18n/useT";

/** Account settings (#39): download my data, withdraw consent, delete my account. */
export default function AccountPage() {
  const tr = useT();
  const router = useRouter();
  const { toast, show } = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [byCode, setByCode] = useState(false);
  const fail = (e: unknown) => show(e instanceof ApiError ? e.message : tr("Could not complete this. Please try again."));

  const download = async () => {
    setBusy("export");
    try {
      const data = await api.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }));
      const a = document.createElement("a");
      a.href = url; a.download = "internsetu-my-data.json"; a.click();
      URL.revokeObjectURL(url);
      show(tr("Your data is ready."), "success");
    } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const withdraw = async () => {
    setBusy("consent");
    try { await api.withdrawConsent(); show(tr("Consent withdrawn."), "success"); router.push("/consent"); } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const sendCode = async () => {
    setBusy("code");
    try { await api.requestDeleteCode(); setByCode(true); show(tr("A code has been sent to your email."), "success"); } catch (e) { fail(e); } finally { setBusy(null); }
  };
  const remove = async () => {
    setBusy("delete");
    try { await api.deleteAccount(byCode ? { code: code.trim() } : { password }); show(tr("Your account was deleted."), "success"); endSession(); router.push("/"); } catch (e) { fail(e); } finally { setBusy(null); }
  };

  return (
    <main className="profile-page">
      {toast}
      <Header label={tr("Account")} />
      <section className="reco-wrap">
        <div className="page-head card-rise"><div><Illustration name="account" className="login-hero" /><h1>{tr("Your account")}</h1></div></div>
        <article className="job-card">
          <h3>{tr("Download my data")}</h3>
          <p className="muted">{tr("Get a copy of everything InternSetu has saved about you.")}</p>
          <button type="button" className="ghost-btn" disabled={busy !== null} onClick={download}>{tr("Download my data")}</button>
        </article>
        <article className="job-card">
          <h3>{tr("Withdraw my consent")}</h3>
          <p className="muted">{tr("You will not get recommendations until you agree again. Your profile stays saved.")}</p>
          <button type="button" className="ghost-btn" disabled={busy !== null} onClick={withdraw}>{tr("Withdraw my consent")}</button>
        </article>
        <article className="job-card">
          <h3>{tr("Delete my account")}</h3>
          <p className="muted">{tr("This permanently deletes your profile, skills and saved internships. It cannot be undone.")}</p>
          {!confirming ? (
            <button type="button" className="ghost-btn danger" disabled={busy !== null} onClick={() => setConfirming(true)}>{tr("Delete my account")}</button>
          ) : (
            <div className="form-field">
              {byCode ? (
                <>
                  <label htmlFor="del-code">{tr("Enter the 6-digit code we emailed you")}</label>
                  <input id="del-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" />
                </>
              ) : (
                <>
                  <label htmlFor="del-pw">{tr("Enter your password to confirm")}</label>
                  <input id="del-pw" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                  <button type="button" className="ghost-btn" disabled={busy !== null} onClick={sendCode}>{tr("Email me a code instead")}</button>
                </>
              )}
              <div className="chip-row">
                <button type="button" className="ghost-btn danger" disabled={busy !== null || (byCode ? code.trim().length !== 6 : !password)} onClick={remove}>{tr("Yes, delete everything")}</button>
                <button type="button" className="ghost-btn" disabled={busy !== null} onClick={() => { setConfirming(false); setPassword(""); setCode(""); setByCode(false); }}>{tr("Cancel")}</button>
              </div>
            </div>
          )}
        </article>
      </section>
    </main>
  );
}
