import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const { email, code } = await req.json();
    const e = (email || "").toLowerCase();
    if (!e || !code) return NextResponse.json({ ok: false, error: "Email and code required" }, { status: 400 });

    const admin = (await import("firebase-admin")).default;
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return NextResponse.json({ ok: false, error: "FIREBASE_SERVICE_ACCOUNT env var not set" }, { status: 501 });
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }
    const db = admin.firestore();
    const ref = db.collection("otps").doc(e);
    const snap = await ref.get();
    if (!snap.exists) return NextResponse.json({ ok: false, error: "Request a code first" }, { status: 400 });
    const d = snap.data();
    if (Date.now() > d.expiresAt) { await ref.delete(); return NextResponse.json({ ok: false, error: "Code expired — resend" }, { status: 400 }); }
    if (String(code) !== String(d.code)) return NextResponse.json({ ok: false, error: "Incorrect code" }, { status: 400 });
    await ref.delete();

    let user;
    try { user = await admin.auth().getUserByEmail(e); }
    catch { user = await admin.auth().createUser({ email: e, emailVerified: true }); }
    const token = await admin.auth().createCustomToken(user.uid);
    return NextResponse.json({ ok: true, token });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
