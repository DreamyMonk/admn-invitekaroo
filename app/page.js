"use client";
import { useEffect, useState } from "react";
import {
  watchAuth,
  logout,
  isAdminEmail,
  watchHostApplications,
  setApplicationStatus,
  deleteApplication,
  platformStats,
  watchOtpDebug,
  deleteOtpDebug,
  watchCommunities,
  setCommunitySuspended,
  deleteCommunityCascade,
  watchUsers,
  setUserSuspended,
  deleteUser,
} from "@/lib/db";
import Icon from "@/components/Icon";
import AuthGate from "@/components/AuthGate";

const STATUS_META = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
};

const TITLES = {
  applications: "Host Applications",
  overview: "Platform Overview",
  communities: "Communities",
  users: "Users",
  codes: "Login Codes (test)",
};

const META_KEYS = new Set([
  "id", "status", "track", "applicantUid", "applicantName", "applicantMobile",
  "submittedAt", "createdAt", "reviewedAt", "name", "mobile", "email",
]);

const LABELS = {
  cityState: "City & State", role: "Role", orgName: "Organisation", communityName: "Community",
  venueName: "Venue", landmarkArea: "Landmark & area", venueAddress: "Address",
  dailyAttendance: "Daily attendance", eventType: "Event type", guru: "Guru / speaker",
  bride: "Bride", groom: "Groom", family: "Family", weddingVenue: "Wedding venue",
  weddingCityArea: "City & area", weddingDateFrom: "From", weddingDateTo: "To",
  funcCount: "Functions", mainFunctions: "Main functions", guestCount: "Guest count",
  needInvites: "Digital invites",
};
const labelOf = (k) => LABELS[k] || k.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

export default function AdminHome() {
  const [user, setUser] = useState(undefined);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("applications");

  useEffect(() => watchAuth((u) => { setUser(u || null); setReady(true); }), []);

  if (user === undefined || !ready)
    return <div className="center-screen"><div style={{ color: "#fff" }}>Loading…</div></div>;
  if (!user) return <AuthGate />;
  if (!isAdminEmail(user.email)) return <NotAuthorized email={user.email} />;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "252px 1fr", height: "100vh" }}>
      <aside className="side">
        <div className="side-top">
          <div className="side-brand">
            <div className="mk"><Icon name="layers" size={20} stroke="#fff" /></div>
            <div><div className="nm">Invite <b>Karoo</b></div><div className="rl">Platform Admin</div></div>
          </div>
        </div>
        <nav className="nav">
          <div className="nav-sec">Review</div>
          <div className={`nav-i ${view === "applications" ? "on" : ""}`} onClick={() => setView("applications")}>
            <Icon name="user" /><span>Host Applications</span>
          </div>
          <div className={`nav-i ${view === "overview" ? "on" : ""}`} onClick={() => setView("overview")}>
            <Icon name="grid" /><span>Platform Overview</span>
          </div>
          <div className="nav-sec">Manage</div>
          <div className={`nav-i ${view === "communities" ? "on" : ""}`} onClick={() => setView("communities")}>
            <Icon name="flower" /><span>Communities</span>
          </div>
          <div className={`nav-i ${view === "users" ? "on" : ""}`} onClick={() => setView("users")}>
            <Icon name="users" /><span>Users</span>
          </div>
          <div className="nav-sec">Testing</div>
          <div className={`nav-i ${view === "codes" ? "on" : ""}`} onClick={() => setView("codes")}>
            <Icon name="clock" /><span>Login Codes</span>
          </div>
        </nav>
        <div className="side-foot">
          <div className="host-chip">
            <div className="av">{(user.email || "A").slice(0, 2).toUpperCase()}</div>
            <div className="hn"><div className="t">Admin</div><div className="s">{user.email}</div></div>
          </div>
        </div>
      </aside>

      <div className="main" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <header className="topbar">
          <div className="tb-title">
            <div className="t">{TITLES[view] || "Admin"}</div>
            <div className="s">Invite Karoo — Admin</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={15} /> Log out</button>
        </header>
        <main className="view" style={{ overflowY: "auto", flex: 1, padding: 24 }}>
          <div className="view-in">
            {view === "applications" ? <Applications />
              : view === "communities" ? <Communities />
              : view === "users" ? <Users />
              : view === "codes" ? <LoginCodes />
              : <Overview />}
          </div>
        </main>
      </div>
    </div>
  );
}

function NotAuthorized({ email }) {
  return (
    <div className="center-screen">
      <div className="card" style={{ maxWidth: 420, width: "100%", textAlign: "center" }}>
        <div className="logo" style={{ margin: "0 auto 12px" }}><Icon name="layers" size={22} stroke="#fff" /></div>
        <div className="h2">Not authorized</div>
        <p className="muted" style={{ marginTop: 6 }}>
          <b>{email}</b> is not an admin account. Ask the platform owner to add your email to the admin allowlist.
        </p>
        <button className="btn btn-ghost btn-block" style={{ marginTop: 16 }} onClick={logout}>
          <Icon name="logout" size={15} /> Sign out
        </button>
      </div>
    </div>
  );
}

function Applications() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [busy, setBusy] = useState("");

  useEffect(() => watchHostApplications(setRows), []);

  const counts = rows.reduce((a, r) => { const s = r.status || "pending"; a[s] = (a[s] || 0) + 1; return a; }, {});
  const view = filter === "all" ? rows : rows.filter((r) => (r.status || "pending") === filter);

  async function act(id, status) {
    setBusy(id + status);
    try { await setApplicationStatus(id, status); } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy("");
  }
  async function remove(id) {
    if (!confirm("Delete this application permanently?")) return;
    setBusy(id + "del");
    try { await deleteApplication(id); } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy("");
  }

  const tabs = [
    ["pending", "Pending"], ["approved", "Approved"], ["rejected", "Rejected"], ["all", "All"],
  ];

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map(([k, lbl]) => (
          <button key={k} className={`btn btn-sm ${filter === k ? "btn-p" : "btn-ghost"}`} onClick={() => setFilter(k)}>
            {lbl}{k !== "all" && counts[k] ? ` · ${counts[k]}` : ""}
          </button>
        ))}
      </div>

      {view.length === 0 ? (
        <div className="card"><div className="empty">
          <Icon name="user" size={40} />
          <div style={{ marginTop: 10 }}>No {filter === "all" ? "" : filter} applications. They arrive here when someone applies to host from the app.</div>
        </div></div>
      ) : (
        view.map((a) => <AppCard key={a.id} a={a} busy={busy} onAct={act} onRemove={remove} />)
      )}
    </>
  );
}

function AppCard({ a, busy, onAct, onRemove }) {
  const [open, setOpen] = useState(false);
  const st = STATUS_META[a.status || "pending"] || STATUS_META.pending;
  const details = Object.entries(a).filter(([k, v]) => !META_KEYS.has(k) && v !== "" && v != null);

  return (
    <div className="card" style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className="mk" style={{ flexShrink: 0 }}>
          <Icon name={a.track === "wedding" ? "heart" : "flower"} size={18} stroke="#fff" />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{a.name || a.applicantName || "Applicant"}</div>
            <span style={{ fontSize: ".58rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: ".5px", padding: "2px 8px", borderRadius: 20, background: "var(--t1)", color: "var(--t7)" }}>
              {a.track === "wedding" ? "Wedding" : "Community"}
            </span>
            <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
          </div>
          <div className="muted" style={{ marginTop: 3, fontSize: ".72rem" }}>
            {[a.mobile || a.applicantMobile, a.email, a.cityState].filter(Boolean).join(" · ")}
          </div>
          <div className="muted" style={{ marginTop: 2, fontSize: ".64rem" }}>Submitted {a.submittedAt || "—"}</div>
        </div>
      </div>

      {open && details.length > 0 && (
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10, borderTop: "1px solid var(--bd)", paddingTop: 12 }}>
          {details.map(([k, v]) => (
            <div key={k}>
              <div style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink4)", fontWeight: 700 }}>{labelOf(k)}</div>
              <div style={{ fontSize: ".82rem", marginTop: 1 }}>{String(v)}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>
          {open ? "Hide details" : `View details${details.length ? ` (${details.length})` : ""}`}
        </button>
        <div style={{ flex: 1 }} />
        {a.status !== "approved" && (
          <button className="btn btn-p btn-sm" disabled={busy === a.id + "approved"} onClick={() => onAct(a.id, "approved")}>
            <Icon name="check" size={13} stroke="#fff" /> {busy === a.id + "approved" ? "…" : "Approve"}
          </button>
        )}
        {a.status !== "rejected" && (
          <button className="btn btn-ghost btn-sm" disabled={busy === a.id + "rejected"} onClick={() => onAct(a.id, "rejected")}>
            <Icon name="x" size={13} /> {busy === a.id + "rejected" ? "…" : "Reject"}
          </button>
        )}
        <button className="btn btn-ghost btn-sm" disabled={busy === a.id + "del"} onClick={() => onRemove(a.id)}>
          <Icon name="trash" size={13} />
        </button>
      </div>
    </div>
  );
}

// Shared 360° detail grid — renders all non-trivial fields of a record.
function DetailGrid({ obj, skip }) {
  const skipSet = new Set(skip || []);
  const rows = Object.entries(obj).filter(([k, v]) =>
    !skipSet.has(k) && v != null && v !== "" && typeof v !== "object");
  if (rows.length === 0) return null;
  return (
    <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, borderTop: "1px solid var(--bd)", paddingTop: 12 }}>
      {rows.map(([k, v]) => (
        <div key={k}>
          <div style={{ fontSize: ".56rem", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink4)", fontWeight: 700 }}>{k.replace(/([A-Z])/g, " $1")}</div>
          <div style={{ fontSize: ".82rem", marginTop: 1, wordBreak: "break-word" }}>{String(v)}</div>
        </div>
      ))}
    </div>
  );
}

function SuspendBadge({ suspended }) {
  return suspended ? (
    <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#FEE2E2", color: "#B91C1C" }}>Suspended</span>
  ) : (
    <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "#DCFCE7", color: "#15803D" }}>Active</span>
  );
}

function ManageActions({ suspended, busy, onSuspend, onUnsuspend, onDelete, onToggle, open, detailsCount }) {
  return (
    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
      <button className="btn btn-ghost btn-sm" onClick={onToggle}>
        {open ? "Hide 360° info" : `360° info${detailsCount ? ` (${detailsCount})` : ""}`}
      </button>
      <div style={{ flex: 1 }} />
      {suspended ? (
        <button className="btn btn-p btn-sm" disabled={busy} onClick={onUnsuspend}><Icon name="check" size={13} stroke="#fff" /> {busy ? "…" : "Unsuspend"}</button>
      ) : (
        <button className="btn btn-ghost btn-sm" disabled={busy} onClick={onSuspend}><Icon name="clock" size={13} /> {busy ? "…" : "Suspend"}</button>
      )}
      <button className="btn btn-danger btn-sm" disabled={busy} onClick={onDelete}><Icon name="trash" size={13} /> Delete</button>
    </div>
  );
}

function Communities() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  useEffect(() => watchCommunities(setRows), []);

  const view = filter === "all" ? rows
    : filter === "suspended" ? rows.filter((c) => c.suspended)
    : rows.filter((c) => !c.suspended);

  async function run(id, fn) {
    setBusy(id);
    try { await fn(); } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy("");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["all", "All"], ["active", "Active"], ["suspended", "Suspended"]].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${filter === k ? "btn-p" : "btn-ghost"}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {view.length === 0 ? (
        <div className="card"><div className="empty"><Icon name="flower" size={40} /><div style={{ marginTop: 10 }}>No communities.</div></div></div>
      ) : view.map((c) => <CommunityCard key={c.id} c={c} busy={busy} run={run} />)}
    </>
  );
}

function CommunityCard({ c, busy, run }) {
  const [open, setOpen] = useState(false);
  const b = busy === c.id;
  const sub = [c.city, c.venue].filter(Boolean).join(" · ");
  return (
    <div className="card" style={{ marginBottom: 14, opacity: c.suspended ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className="mk" style={{ flexShrink: 0 }}><Icon name="flower" size={18} stroke="#fff" /></div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{c.name || "Community"}</div>
            {c.editionLabel && <span style={{ fontSize: ".58rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--t1)", color: "var(--t7)" }}>{c.editionLabel}</span>}
            <SuspendBadge suspended={c.suspended} />
          </div>
          <div className="muted" style={{ marginTop: 3, fontSize: ".72rem" }}>{sub || "—"}</div>
          <div className="muted" style={{ marginTop: 2, fontSize: ".62rem", fontFamily: "var(--fm)" }}>owner: {c.ownerUid || "—"}</div>
        </div>
      </div>
      {open && <DetailGrid obj={c} skip={["id", "suspended"]} />}
      <ManageActions
        suspended={c.suspended} busy={b} open={open} onToggle={() => setOpen((o) => !o)}
        onSuspend={() => run(c.id, () => setCommunitySuspended(c.id, true))}
        onUnsuspend={() => run(c.id, () => setCommunitySuspended(c.id, false))}
        onDelete={() => { if (confirm(`Delete "${c.name}" and all its programmes? This cannot be undone.`)) run(c.id, () => deleteCommunityCascade(c.id)); }}
      />
    </div>
  );
}

function Users() {
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  useEffect(() => watchUsers(setRows), []);

  const view = filter === "all" ? rows
    : filter === "suspended" ? rows.filter((u) => u.suspended)
    : rows.filter((u) => !u.suspended);

  async function run(id, fn) {
    setBusy(id);
    try { await fn(); } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy("");
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        {[["all", "All"], ["active", "Active"], ["suspended", "Suspended"]].map(([k, l]) => (
          <button key={k} className={`btn btn-sm ${filter === k ? "btn-p" : "btn-ghost"}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>
      {view.length === 0 ? (
        <div className="card"><div className="empty"><Icon name="users" size={40} /><div style={{ marginTop: 10 }}>No users yet. App users appear here once they sign in and sync.</div></div></div>
      ) : view.map((u) => <UserCard key={u.id} u={u} busy={busy} run={run} />)}
    </>
  );
}

function UserCard({ u, busy, run }) {
  const [open, setOpen] = useState(false);
  const b = busy === u.id;
  const p = u.profile || {};
  const name = [p.name, p.family].filter(Boolean).join(" ") || "User";
  const counts = [
    ["events", (u.events || []).length],
    ["subscriptions", (u.subs || []).length],
    ["saved", (u.saved || []).length],
    ["check-ins", (u.checkIns || []).length],
  ];
  return (
    <div className="card" style={{ marginBottom: 14, opacity: u.suspended ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className="av" style={{ flexShrink: 0 }}>{name.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{name}</div>
            <SuspendBadge suspended={u.suspended} />
          </div>
          <div className="muted" style={{ marginTop: 3, fontSize: ".72rem" }}>{[p.mobile, p.city].filter(Boolean).join(" · ") || "—"}</div>
          <div className="muted" style={{ marginTop: 2, fontSize: ".62rem", fontFamily: "var(--fm)" }}>uid: {u.id}</div>
        </div>
      </div>
      {open && (
        <>
          <DetailGrid obj={p} skip={[]} />
          <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
            {counts.map(([lbl, n]) => (
              <div key={lbl} style={{ fontSize: ".72rem" }}><b style={{ fontFamily: "var(--fm)" }}>{n}</b> <span className="muted">{lbl}</span></div>
            ))}
          </div>
        </>
      )}
      <ManageActions
        suspended={u.suspended} busy={b} open={open} onToggle={() => setOpen((o) => !o)} detailsCount={Object.keys(p).length}
        onSuspend={() => run(u.id, () => setUserSuspended(u.id, true))}
        onUnsuspend={() => run(u.id, () => setUserSuspended(u.id, false))}
        onDelete={() => { if (confirm(`Delete ${name}'s data? (The Firebase Auth account itself needs server-side deletion.)`)) run(u.id, () => deleteUser(u.id)); }}
      />
    </div>
  );
}

function LoginCodes() {
  const [rows, setRows] = useState([]);
  useEffect(() => watchOtpDebug(setRows), []);

  function fmtTime(ts) {
    try { return ts?.toDate ? ts.toDate().toLocaleString() : "—"; } catch { return "—"; }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16, background: "var(--t0)", border: "1px solid var(--t1)" }}>
        <div style={{ fontSize: ".82rem", color: "var(--ink2)" }}>
          <b>Test login codes.</b> When someone uses “Test login (no SMS)” in the app, the generated
          code appears here — read it and enter it in the app to sign in. For testing only.
        </div>
      </div>
      <div className="card">
        <div className="card-h" style={{ marginBottom: 8 }}><div className="ttl"><Icon name="clock" /> Codes · {rows.length}</div></div>
        {rows.length === 0 ? (
          <div className="empty"><Icon name="clock" size={40} /><div style={{ marginTop: 10 }}>No test codes yet. Tap “Test login (no SMS)” in the app to generate one.</div></div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>{["Number", "Code", "Status", "Generated", ""].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "8px 10px", fontSize: ".62rem", textTransform: "uppercase", letterSpacing: ".5px", color: "var(--ink4)", borderBottom: "1px solid var(--bd)" }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ padding: "10px", fontSize: ".82rem", fontFamily: "var(--fm)", borderBottom: "1px solid var(--bd)" }}>{r.number || r.id}</td>
                  <td style={{ padding: "10px", borderBottom: "1px solid var(--bd)" }}>
                    <span style={{ fontFamily: "var(--fm)", fontWeight: 800, fontSize: "1.05rem", letterSpacing: "3px", color: "var(--t7)" }}>{r.code || "—"}</span>
                  </td>
                  <td style={{ padding: "10px", fontSize: ".72rem", borderBottom: "1px solid var(--bd)" }}>
                    <span style={{ fontWeight: 700, color: r.used ? "#15803D" : "#B45309" }}>{r.used ? "Used" : "Active"}</span>
                  </td>
                  <td style={{ padding: "10px", fontSize: ".72rem", color: "var(--ink3)", borderBottom: "1px solid var(--bd)" }}>{fmtTime(r.at)}</td>
                  <td style={{ padding: "10px", textAlign: "right", borderBottom: "1px solid var(--bd)" }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => deleteOtpDebug(r.id)}><Icon name="trash" size={13} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

function Overview() {
  const [s, setS] = useState(null);
  useEffect(() => { platformStats().then(setS); }, []);
  const cards = [
    { ic: "flower", val: s?.communities, lbl: "Communities" },
    { ic: "cal", val: s?.programmes, lbl: "Programmes published" },
    { ic: "user", val: s?.applications, lbl: "Host applications" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
      {cards.map((c) => (
        <div className="card" key={c.lbl}>
          <div className="mk" style={{ marginBottom: 10 }}><Icon name={c.ic} size={18} stroke="#fff" /></div>
          <div style={{ fontSize: "1.8rem", fontWeight: 800, fontFamily: "var(--fm)" }}>{s ? c.val : "…"}</div>
          <div className="muted" style={{ fontSize: ".72rem" }}>{c.lbl}</div>
        </div>
      ))}
    </div>
  );
}
