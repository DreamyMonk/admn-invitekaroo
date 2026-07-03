# Invite Karoo — Admin Panel

Standalone Next.js app for the **platform admin** to review **host applications**
submitted from the Invite Karoo mobile app. Deploys to **admin.invitekaroo.com**.

- **Login:** email OTP (one-time code via Resend → Firebase custom token), gated to
  the `NEXT_PUBLIC_ADMIN_EMAILS` allowlist.
- **Host Applications:** live list from Firestore `hostApplications` — filter by
  Pending / Approved / Rejected, expand full details, Approve / Reject / delete.
- **Communities:** all communities with 360° info; **Suspend** (also hides its
  programmes from the app), **Unsuspend**, and **Delete** (removes the community
  + its programmes).
- **Users:** all app users with 360° profile + activity counts; **Suspend**,
  **Unsuspend**, **Delete** (removes the user's Firestore data; deleting the
  Firebase Auth account itself needs a server function).
- **Platform Overview:** live counts of communities, published programmes, applications.
- **Admins & Access (super-admins only):** add other admins by email with
  **module-wise access control** — pick exactly which modules each admin can use,
  or make them a super-admin (full access). Edit / remove admins anytime. Backed by
  the Firestore `admins/{email}` collection; owner emails from
  `NEXT_PUBLIC_ADMIN_EMAILS` are always super-admins.
- **Login Codes (testing):** when SMS OTP isn't set up, the app's **“Test login
  (no SMS)”** generates a login code and publishes it to Firestore `otpDebug`.
  This view shows the number + code so a tester can read it and finish logging in.
  Test-only — the app signs in anonymously; tighten/remove `otpDebug` rules and
  the app's test button before production.

## Deploy (Vercel)
1. Import this repo as a new Vercel project.
2. Add the domain **admin.invitekaroo.com** (DNS: CNAME → Vercel).
3. Add it to **Firebase → Authentication → Settings → Authorized domains**.
4. Set env vars (Settings → Environment Variables):

| Var | Value |
|---|---|
| `FIREBASE_SERVICE_ACCOUNT` | service-account JSON (one line) — email-OTP custom tokens |
| `RESEND_API_KEY` | Resend API key — sends the OTP email |
| `NEXT_PUBLIC_ADMIN_EMAILS` | comma-separated admin emails |

5. **Firestore rules** — the app project's `firestore.rules` must include the
   `hostApplications` block + `isAdmin()` allowlist (keep it in sync with
   `NEXT_PUBLIC_ADMIN_EMAILS`).

## Local dev
```bash
npm install
npm run dev   # http://localhost:3000  (OTP needs the env vars in .env.local)
```

> This shares the same Firebase project as the app + host dashboard. Host
> applications are written by the app (`hostApplications` collection); this panel
> reads and updates their `status`.
