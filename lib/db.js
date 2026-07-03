// Admin data layer — Firestore reads/writes for the platform admin panel.
import { auth, db } from "./firebase";
import { signInWithCustomToken, signOut, onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
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

/* ─────────── Test login codes (otpDebug) ─────────── */
// The app publishes a generated login code here (test bypass, no SMS) so an
// admin can read it and complete login for testing.
export function watchOtpDebug(cb) {
  const q = query(collection(db, "otpDebug"), orderBy("at", "desc"));
  return onSnapshot(
    q,
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
export const deleteOtpDebug = (id) => deleteDoc(doc(db, "otpDebug", id));

/* ─────────── Admin: communities ─────────── */
export function watchCommunities(cb) {
  return onSnapshot(
    collection(db, "communities"),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
async function communityProgramDocs(cid) {
  const snap = await getDocs(query(collection(db, "programs"), where("communityId", "==", cid)));
  return snap.docs;
}
// Suspend/unsuspend: flag the community AND hide/show its programmes so the
// change takes effect in the app immediately.
export async function setCommunitySuspended(cid, suspended) {
  await updateDoc(doc(db, "communities", cid), { suspended, updatedAt: serverTimestamp() });
  const docs = await communityProgramDocs(cid);
  await Promise.all(docs.map((d) => updateDoc(d.ref, { published: !suspended })));
}
// Delete a community and all its top-level programmes.
export async function deleteCommunityCascade(cid) {
  const docs = await communityProgramDocs(cid);
  await Promise.all(docs.map((d) => deleteDoc(d.ref)));
  await deleteDoc(doc(db, "communities", cid));
}

/* ─────────── Admin: app users ─────────── */
export function watchUsers(cb) {
  return onSnapshot(
    collection(db, "users"),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
export const setUserSuspended = (uid, suspended) =>
  updateDoc(doc(db, "users", uid), { suspended, updatedAt: serverTimestamp() });
// Removes the user's Firestore profile/data. Deleting the Firebase Auth account
// itself requires a server (admin SDK) and is not done here.
export const deleteUser = (uid) => deleteDoc(doc(db, "users", uid));

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

/* ─────────── Admin allowlist (owner / super) ─────────── */
// Env allowlist = the bootstrap OWNER accounts (always super admins). Additional
// admins are managed dynamically in the `admins` collection below.
export function adminEmails() {
  const raw = process.env.NEXT_PUBLIC_ADMIN_EMAILS || "invitekaroo@gmail.com";
  return raw.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
}
export const isAdminEmail = (email) => !!email && adminEmails().includes(email.toLowerCase());

/* ─────────── Admins (RBAC — module-wise access) ─────────── */
// Each admin doc id is the email. { email, role: 'super'|'admin', modules: [...] }.
export async function getAdminDoc(email) {
  if (!email) return null;
  const s = await getDoc(doc(db, "admins", email.toLowerCase()));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}
export function watchAdmins(cb) {
  return onSnapshot(
    collection(db, "admins"),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb([]),
  );
}
export async function saveAdmin(email, { role, modules, addedBy }) {
  const key = email.trim().toLowerCase();
  await setDoc(
    doc(db, "admins", key),
    {
      email: key,
      role: role || "admin",
      modules: modules || [],
      ...(addedBy ? { addedBy } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
export const removeAdmin = (email) => deleteDoc(doc(db, "admins", email.toLowerCase()));
