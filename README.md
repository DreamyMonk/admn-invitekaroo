# Invite Karoo — Admin Panel

Standalone Next.js app for the **platform admin** to review **host applications**
submitted from the Invite Karoo mobile app. Deploys to **admin.invitekaroo.com**.

- **Login:** email OTP (one-time code via Resend → Firebase custom token), gated to
  the `NEXT_PUBLIC_ADMIN_EMAILS` allowlist.
- **Host Applications:** live list from Firestore `hostApplications` — filter by
  Pending / Approved / Rejected, expand full details, Approve / Reject / delete.
- **Platform Overview:** live counts of communities, published programmes, applications.

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
