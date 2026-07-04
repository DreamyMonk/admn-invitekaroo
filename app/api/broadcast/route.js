import { NextResponse } from "next/server";

// Platform-wide announcement → FCM topic "all_users" (every app install is
// subscribed). Admin-only: the caller must pass a valid Firebase ID token whose
// email is an owner (env allowlist) or has an `admins` doc.
export async function POST(req) {
  try {
    const { token, title, body, html } = await req.json();
    if (!title) return NextResponse.json({ ok: false, error: "Title required" }, { status: 400 });
    if (!token) return NextResponse.json({ ok: false, error: "Not signed in" }, { status: 401 });

    const admin = (await import("firebase-admin")).default;
    if (!admin.apps.length) {
      const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
      if (!raw) return NextResponse.json({ ok: false, error: "FIREBASE_SERVICE_ACCOUNT env var not set" }, { status: 501 });
      admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)) });
    }

    // Verify the caller is a signed-in admin.
    let email = "";
    try {
      const dec = await admin.auth().verifyIdToken(token);
      email = (dec.email || "").toLowerCase();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid session" }, { status: 401 });
    }
    const allow = (process.env.NEXT_PUBLIC_ADMIN_EMAILS || "invitekaroo@gmail.com")
      .toLowerCase().split(",").map((s) => s.trim()).filter(Boolean);
    let isAdmin = allow.includes(email);
    if (!isAdmin) {
      const snap = await admin.firestore().collection("admins").doc(email).get();
      isAdmin = snap.exists;
    }
    if (!isAdmin) return NextResponse.json({ ok: false, error: "Not an admin account" }, { status: 403 });

    const id = await admin.messaging().send({
      topic: "all_users",
      notification: { title, body: body || "" },
      android: {
        priority: "high",
        notification: {
          channelId: "ik_default",
          sound: "default",
          defaultSound: true,
          notificationPriority: "PRIORITY_HIGH",
          defaultVibrateTimings: true,
          visibility: "PUBLIC",
        },
      },
      apns: { payload: { aps: { sound: "default" } } },
      data: { type: "announcement" },
    });
    // Keep a record (rich HTML + plain text) for the audit trail / future in-app view.
    try {
      await admin.firestore().collection("announcements").add({
        title,
        body: body || "",
        html: html || "",
        sentBy: email,
        at: admin.firestore.FieldValue.serverTimestamp(),
      });
    } catch (_) {}
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
