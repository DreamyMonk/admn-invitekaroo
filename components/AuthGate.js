"use client";
import { useState, useEffect } from "react";
import { sendEmailOtp, verifyEmailOtp } from "@/lib/db";
import Icon from "./Icon";

export default function AuthGate() {
  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);

  useEffect(() => {
    if (secs <= 0) return;
    const t = setInterval(() => setSecs((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [secs]);

  async function send(e) {
    e && e.preventDefault();
    if (!email.trim()) return setErr("Enter your admin email");
    setErr(""); setBusy(true);
    try { await sendEmailOtp(email); setStep("otp"); setSecs(45); setCode(""); }
    catch (e2) { setErr(String(e2.message || e2)); }
    setBusy(false);
  }
  async function verify(e) {
    e.preventDefault();
    if (code.trim().length < 6) return setErr("Enter the 6-digit code");
    setErr(""); setBusy(true);
    try { await verifyEmailOtp(email, code); /* onAuthStateChanged swaps in the panel */ }
    catch (e2) { setErr(String(e2.message || e2)); setBusy(false); }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ textAlign: "center", marginBottom: 18 }}>
          <div style={{ width: 140, margin: "0 auto 8px", background: "#fff", borderRadius: 20, padding: 12, boxShadow: "0 10px 34px rgba(0,0,0,.12)" }}>
            <img src="/logo.jpg" alt="Invite Karoo" style={{ width: "100%", display: "block", borderRadius: 10 }} />
          </div>
          <div className="sub">Platform Admin</div>
        </div>
        <div className="card">
          {step === "email" ? (
            <form onSubmit={send}>
              <div className="h2" style={{ marginBottom: 4 }}>Admin sign in</div>
              <p className="muted" style={{ marginBottom: 8 }}>We'll email you a one-time code. Access is limited to admin accounts.</p>
              <label className="label">Email</label>
              <input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
              {err && <div className="err">{err}</div>}
              <button className="btn btn-p btn-block" style={{ marginTop: 16 }} disabled={busy}>
                {busy ? "Sending…" : "Send code"} <Icon name="send" size={15} stroke="#fff" />
              </button>
            </form>
          ) : (
            <form onSubmit={verify}>
              <div className="h2" style={{ marginBottom: 4 }}>Enter code</div>
              <p className="muted" style={{ marginBottom: 8 }}>Sent to <b>{email}</b></p>
              <input
                className="input"
                inputMode="numeric"
                maxLength={6}
                autoFocus
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="••••••"
                style={{ textAlign: "center", fontFamily: "var(--fm)", fontSize: "1.6rem", letterSpacing: "12px", fontWeight: 700 }}
              />
              {err && <div className="err">{err}</div>}
              <button className="btn btn-p btn-block" style={{ marginTop: 16 }} disabled={busy}>
                {busy ? "Verifying…" : "Verify & continue"} <Icon name="arrowR" size={15} stroke="#fff" />
              </button>
              <div style={{ textAlign: "center", marginTop: 14, fontSize: ".78rem", color: "var(--ink3)" }}>
                {secs > 0 ? <>Resend in <b style={{ fontFamily: "var(--fm)", color: "var(--t7)" }}>0:{String(secs).padStart(2, "0")}</b></>
                  : <span style={{ color: "var(--t7)", fontWeight: 700, cursor: "pointer" }} onClick={() => send()}>Resend code</span>}
                <span style={{ margin: "0 8px", color: "var(--ink4)" }}>·</span>
                <span style={{ cursor: "pointer" }} onClick={() => { setStep("email"); setErr(""); }}>Change email</span>
              </div>
            </form>
          )}
        </div>
        <p style={{ textAlign: "center", marginTop: 14, fontSize: ".74rem", color: "rgba(255,255,255,.5)" }}>
          Review host applications submitted from the Invite Karoo app.
        </p>
      </div>
    </div>
  );
}
