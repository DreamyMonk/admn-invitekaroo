import { NextResponse } from "next/server";

function admin() {
  // lazy-init firebase-admin
  return import("firebase-admin").then((m) => {
    const admin = m.default;
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT env var not set on Vercel");
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }
    return admin;
  });
}

export async function POST(req) {
  try {
    const { email } = await req.json();
    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email" }, { status: 400 });
    }
    const key = process.env.RESEND_API_KEY;
    if (!key) return NextResponse.json({ ok: false, error: "RESEND_API_KEY env var not set on Vercel" }, { status: 501 });

    const a = await admin();
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await a.firestore().collection("otps").doc(email.toLowerCase()).set({
      code,
      email: email.toLowerCase(),
      expiresAt: Date.now() + 10 * 60 * 1000,
      createdAt: a.firestore.FieldValue.serverTimestamp(),
    });

    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invite Karoo <noreply@invitekaroo.com>",
        to: [email],
        subject: `Your Invite Karoo host code: ${code}`,
        html: `<div style="font-family:Segoe UI,Arial,sans-serif;max-width:440px;margin:auto;padding:28px;border:1px solid #eee;border-radius:16px">
          <h2 style="font-family:Georgia,serif;color:#1A1028;margin:0 0 4px">Invite <span style="color:#D97706">Karoo</span> · Host</h2>
          <p style="color:#555;margin:0 0 18px">Your one-time login code:</p>
          <div style="font-size:34px;font-weight:800;letter-spacing:8px;color:#3D2582;text-align:center;padding:14px;background:#F7F4FC;border-radius:12px">${code}</div>
          <p style="color:#888;font-size:13px;margin-top:18px">Valid for 10 minutes. If you didn't request this, ignore this email.</p>
        </div>`,
      }),
    });
    if (!r.ok) {
      const t = await r.text();
      return NextResponse.json({ ok: false, error: "Email send failed: " + t.slice(0, 200) }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
