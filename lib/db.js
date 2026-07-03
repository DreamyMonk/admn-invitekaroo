// Admin data layer — Firestore reads/writes for the platform admin panel.
import { auth, db } from "./firebase";
import { signInWithCustomToken, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

/* ─────────── Auth (email OTP → Firebase custom token) ─────────── */
export const watchAuth = (cb) => onAuthStateChanged(auth, cb);
export const logout = () => signOut(auth);

// Step 1: email a 6-digit code (server sends via Resend).
export async function sendEmailOtp(email) {
  const r = await fetch("/api/otp/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.error || "Could not send code");
  return j;
}

// Step 2: verify the code → server returns a Firebase custom token → sign in.
export async function verifyEmailOtp(email, code) {
  const r = await fetch("/api/otp/verify", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase(), code: String(code).trim() }),
  });
  const j = await r.json();
  if (!j.ok || !j.token) throw new Error(j.error || "Invalid code");
  const cred = await signInWithCustomToken(auth, j.token);
  // Record the admin's last login (harmless hosts doc — keeps parity with dashboard).
  await setDoc(
    doc(db, "hosts", cred.user.uid),
    { email: email.trim().toLowerCase(), lastLogin: serverTimestamp() },
    { merge: true },
  ).catch(() => {});
  return cred.user;
}

/* ─────────── Host applications ─────────── */
export function watchHostApplications(cb) {
  const q = query(collection(db, "hostApplications"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
export const setApplicationStatus = (id, status) =>
  updateDoc(doc(db, "hostApplications", id), { status, reviewedAt: serverTimestamp() });
export const deleteApplication = (id) => deleteDoc(doc(db, "hostApplications", id));

// Platform-wide counts for the admin overview (admin-readable / public sets).
export async function platformStats() {
  const safe = (p) => p.then((s) => s.size).catch(() => 0);
  const [communities, programmes, applications] = await Promise.all([
    safe(getDocs(collection(db, "communities"))),
    safe(getDocs(collection(db, "programs"))),
    safe(getDocs(collection(db, "hostApplications"))),
  ]);
  return { communities, programmes, applications };
}

/* ─────────── Admin allowlist ─────────── */
export function adminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "invitekaroo@gmail.com";
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export const isAdminEmail = (email) => !!email && adminEmails().includes(email.toLowerCase());
