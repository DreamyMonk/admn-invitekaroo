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
  updateCommunityFields,
  watchUsers,
  setUserSuspended,
  deleteUser,
  watchHosts,
  getHost,
  setHostSuspended,
  deleteHost,
  getAdminDoc,
  watchAdmins,
  saveAdmin,
  removeAdmin,
  broadcastAll,
} from "@/lib/db";
import Icon from "@/components/Icon";
import AuthGate from "@/components/AuthGate";

const STATUS_META = {
  pending: { label: "Pending", color: "#B45309", bg: "#FEF3C7" },
  approved: { label: "Approved", color: "#15803D", bg: "#DCFCE7" },
  rejected: { label: "Rejected", color: "#B91C1C", bg: "#FEE2E2" },
};

// Access-controlled modules (nav order). `sec` groups them in the sidebar.
const MODULES = [
  { id: "applications", label: "Host Applications", ic: "user", sec: "Review" },
  { id: "overview", label: "Platform Overview", ic: "grid", sec: "Review" },
  { id: "communities", label: "Communities", ic: "flower", sec: "Manage" },
  { id: "users", label: "Users", ic: "users", sec: "Manage" },
  { id: "broadcast", label: "Announcements", ic: "bell", sec: "Manage" },
  { id: "codes", label: "Login Codes", ic: "clock", sec: "Testing" },
];
const ALL_MODULE_IDS = MODULES.map((m) => m.id);

const TITLES = {
  applications: "Host Applications",
  overview: "Platform Overview",
  communities: "Communities",
  users: "Users",
  broadcast: "Announcements",
  codes: "Login Codes (test)",
  admins: "Admins & Access",
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

function Loading() {
  return <div className="center-screen"><div style={{ color: "#fff" }}>Loading…</div></div>;
}

export default function AdminHome() {
  const [user, setUser] = useState(undefined);
  const [perm, setPerm] = useState(undefined); // undefined=resolving; null=denied; {isSuper,modules}
  const [view, setView] = useState("overview");

  useEffect(() => watchAuth((u) => setUser(u || null)), []);

  // Resolve the signed-in admin's module access: owner emails are super; others
  // must have an `admins/{email}` doc; role 'super' → all modules.
  useEffect(() => {
    if (user === undefined) return;
    if (!user) { setPerm(undefined); return; }
    let alive = true;
    setPerm(undefined);
    (async () => {
      let p = null;
      if (isAdminEmail(user.email)) {
        p = { isSuper: true, modules: ALL_MODULE_IDS };
      } else {
        const a = await getAdminDoc(user.email).catch(() => null);
        if (a) p = { isSuper: a.role === "super", modules: a.role === "super" ? ALL_MODULE_IDS : (a.modules || []) };
      }
      if (!alive) return;
      setPerm(p);
      if (p) setView(p.modules[0] || (p.isSuper ? "admins" : "none"));
    })();
    return () => { alive = false; };
  }, [user]);

  if (user === undefined) return <Loading />;
  if (!user) return <AuthGate />;
  if (perm === undefined) return <Loading />;
  if (!perm) return <NotAuthorized email={user.email} />;

  const allowed = new Set(perm.modules);
  const canSee = (id) => allowed.has(id) || (id === "admins" && perm.isSuper);
  const shownView = canSee(view) ? view : (perm.modules[0] || (perm.isSuper ? "admins" : "none"));

  // Sidebar nav — only modules this admin can access (+ Admins for super).
  const navItems = [];
  let lastSec = null;
  MODULES.filter((m) => allowed.has(m.id)).forEach((m) => {
    if (m.sec !== lastSec) { navItems.push(<div className="nav-sec" key={"s" + m.sec}>{m.sec}</div>); lastSec = m.sec; }
    navItems.push(
      <div key={m.id} className={`nav-i ${shownView === m.id ? "on" : ""}`} onClick={() => setView(m.id)}>
        <Icon name={m.ic} /><span>{m.label}</span>
      </div>,
    );
  });
  if (perm.isSuper) {
    navItems.push(<div className="nav-sec" key="s-access">Access</div>);
    navItems.push(
      <div key="admins" className={`nav-i ${shownView === "admins" ? "on" : ""}`} onClick={() => setView("admins")}>
        <Icon name="gear" /><span>Admins &amp; Access</span>
      </div>,
    );
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "252px 1fr", height: "100vh" }}>
      <aside className="side">
        <div className="side-top">
          <div className="side-brand">
            <div className="mk" style={{ background: "#fff", overflow: "hidden", padding: 0 }}><img src="/logo.jpg" alt="Invite Karoo" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center 32%" }} /></div>
            <div><div className="nm">Invite <b>Karoo</b></div><div className="rl">{perm.isSuper ? "Super Admin" : "Admin"}</div></div>
          </div>
        </div>
        <nav className="nav">{navItems}</nav>
        <div className="side-foot">
          <div className="host-chip">
            <div className="av">{(user.email || "A").slice(0, 2).toUpperCase()}</div>
            <div className="hn"><div className="t">{perm.isSuper ? "Super Admin" : "Admin"}</div><div className="s">{user.email}</div></div>
          </div>
        </div>
      </aside>

      <div className="main" style={{ overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <header className="topbar">
          <div className="tb-title">
            <div className="t">{TITLES[shownView] || "Admin"}</div>
            <div className="s">Invite Karoo — Admin</div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={logout}><Icon name="logout" size={15} /> Log out</button>
        </header>
        <main className="view" style={{ overflowY: "auto", flex: 1, padding: 24 }}>
          <div className="view-in">
            {shownView === "applications" ? <Applications />
              : shownView === "communities" ? <Communities />
              : shownView === "users" ? <Users />
              : shownView === "broadcast" ? <Broadcast />
              : shownView === "codes" ? <LoginCodes />
              : shownView === "admins" && perm.isSuper ? <Admins email={user.email} />
              : shownView === "overview" ? <Overview />
              : <div className="card"><div className="empty"><Icon name="user" size={40} /><div style={{ marginTop: 10 }}>No modules assigned to your account yet. Ask a super-admin to grant access.</div></div></div>}
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
        <div style={{ width: 96, margin: "0 auto 12px", background: "#fff", borderRadius: 18, padding: 10 }}><img src="/logo.jpg" alt="Invite Karoo" style={{ width: "100%", display: "block", borderRadius: 8 }} /></div>
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

const COMMUNITY_FIELDS = [
  ["name", "Name", "text"], ["about", "About", "area"], ["recurrence", "Recurrence", "text"],
  ["city", "City", "text"], ["area", "Area", "text"], ["venue", "Venue", "text"], ["venueAddr", "Venue address", "text"],
  ["guru", "Guru / Speaker", "text"], ["guruDesc", "Guru description", "text"],
  ["youtube", "YouTube live link", "text"], ["helpline", "Helpline", "text"],
  ["editionLabel", "Edition label", "text"], ["editionStart", "Edition start", "date"], ["editionEnd", "Edition end", "date"],
];

function fmtTs(ts) {
  try { return ts?.toDate ? ts.toDate().toLocaleString() : "—"; } catch { return "—"; }
}

function CommunityCard({ c, busy, run }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [f, setF] = useState(c);
  const [creator, setCreator] = useState(undefined); // undefined=not loaded, null=none
  const [saving, setSaving] = useState(false);
  const b = busy === c.id;
  const sub = [c.city, c.venue].filter(Boolean).join(" · ");

  async function expand() {
    const next = !open;
    setOpen(next);
    if (next && creator === undefined) {
      const h = await getHost(c.ownerUid).catch(() => null);
      setCreator(h);
    }
  }
  function startEdit() { setF(c); setEditing(true); setOpen(true); }
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  async function save() {
    setSaving(true);
    try {
      const data = {};
      COMMUNITY_FIELDS.forEach(([k]) => { data[k] = f[k] ?? ""; });
      data.editionStatus = f.editionStatus || "active";
      await updateCommunityFields(c.id, data);
      setEditing(false);
    } catch (e) { alert("Error: " + (e.message || e)); }
    setSaving(false);
  }

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

      {open && !editing && (
        <>
          <DetailGrid obj={c} skip={["id", "suspended", "createdAt", "updatedAt"]} />
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bd)", fontSize: ".72rem", color: "var(--ink3)" }}>
            <b>Created by:</b>{" "}
            {creator === undefined ? "…" : creator ? (creator.hostName || creator.email || c.ownerUid) : (c.ownerUid || "—")}
            {creator?.email && creator?.hostName ? ` · ${creator.email}` : ""}
            {" · "}<b>Created:</b> {fmtTs(c.createdAt)}
            {c.updatedAt ? <> · <b>Updated:</b> {fmtTs(c.updatedAt)}</> : null}
          </div>
        </>
      )}

      {open && editing && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bd)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
            {COMMUNITY_FIELDS.map(([k, label, type]) => (
              <div key={k} style={type === "area" ? { gridColumn: "1 / -1" } : undefined}>
                <label className="label">{label}</label>
                {type === "area"
                  ? <textarea className="input" rows={2} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />
                  : <input className="input" type={type} value={f[k] || ""} onChange={(e) => set(k, e.target.value)} />}
              </div>
            ))}
            <div>
              <label className="label">Edition status</label>
              <select className="input" value={f.editionStatus || "active"} onChange={(e) => set("editionStatus", e.target.value)}>
                <option value="active">active</option><option value="upcoming">upcoming</option><option value="ended">ended</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button className="btn btn-p btn-sm" disabled={saving} onClick={save}><Icon name="check" size={13} stroke="#fff" /> {saving ? "Saving…" : "Save changes"}</button>
            <button className="btn btn-ghost btn-sm" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={expand}>{open ? "Hide 360° info" : "360° info"}</button>
        {!editing && <button className="btn btn-ghost btn-sm" onClick={startEdit}><Icon name="edit" size={13} /> Edit</button>}
        <div style={{ flex: 1 }} />
        {c.suspended
          ? <button className="btn btn-p btn-sm" disabled={b} onClick={() => run(c.id, () => setCommunitySuspended(c.id, false))}><Icon name="check" size={13} stroke="#fff" /> {b ? "…" : "Unsuspend"}</button>
          : <button className="btn btn-ghost btn-sm" disabled={b} onClick={() => run(c.id, () => setCommunitySuspended(c.id, true))}><Icon name="clock" size={13} /> {b ? "…" : "Suspend"}</button>}
        <button className="btn btn-danger btn-sm" disabled={b} onClick={() => { if (confirm(`Delete "${c.name}" and all its programmes? This cannot be undone.`)) run(c.id, () => deleteCommunityCascade(c.id)); }}><Icon name="trash" size={13} /> Delete</button>
      </div>
    </div>
  );
}

function RoleTag({ kind }) {
  const s = kind === "host"
    ? { label: "Host", bg: "#FEF3C7", color: "#B45309" }
    : { label: "User", bg: "#DBEAFE", color: "#1D4ED8" };
  return <span style={{ fontSize: ".56rem", fontWeight: 800, letterSpacing: ".4px", padding: "2px 8px", borderRadius: 20, background: s.bg, color: s.color }}>{s.label}</span>;
}

function Users() {
  const [users, setUsers] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  useEffect(() => watchUsers(setUsers), []);
  useEffect(() => watchHosts(setHosts), []);

  // Merge app users (`users`) and dashboard hosts (`hosts`) by uid → tag each.
  const map = new Map();
  users.forEach((u) => map.set(u.id, { uid: u.id, user: u, host: null }));
  hosts.forEach((h) => { const e = map.get(h.id) || { uid: h.id, user: null, host: null }; e.host = h; map.set(h.id, e); });
  const people = [...map.values()].map((e) => ({
    ...e,
    isUser: !!e.user, isHost: !!e.host,
    suspended: !!(e.user?.suspended || e.host?.suspended),
  }));

  const view = people.filter((e) =>
    filter === "all" ? true
      : filter === "users" ? e.isUser
      : filter === "hosts" ? e.isHost
      : filter === "suspended" ? e.suspended
      : true);

  async function run(id, fn) {
    setBusy(id);
    try { await fn(); } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy("");
  }

  const tabs = [["all", "All"], ["users", "Users"], ["hosts", "Hosts"], ["suspended", "Suspended"]];
  return (
    <>
      <div style={{ display: "flex", gap: 8, marginBottom: 18, flexWrap: "wrap" }}>
        {tabs.map(([k, l]) => {
          const n = k === "all" ? people.length : k === "users" ? people.filter((e) => e.isUser).length : k === "hosts" ? people.filter((e) => e.isHost).length : people.filter((e) => e.suspended).length;
          return <button key={k} className={`btn btn-sm ${filter === k ? "btn-p" : "btn-ghost"}`} onClick={() => setFilter(k)}>{l}{n ? ` · ${n}` : ""}</button>;
        })}
      </div>
      {view.length === 0 ? (
        <div className="card"><div className="empty"><Icon name="users" size={40} /><div style={{ marginTop: 10 }}>Nobody here yet. App users appear once they sign in &amp; sync; hosts appear once they sign into the dashboard.</div></div></div>
      ) : view.map((e) => <PersonCard key={e.uid} e={e} busy={busy} run={run} />)}
    </>
  );
}

function PersonCard({ e, busy, run }) {
  const [open, setOpen] = useState(false);
  const b = busy === e.uid;
  const p = e.user?.profile || {};
  const name = [p.name, p.family].filter(Boolean).join(" ") || e.host?.hostName || e.host?.email || "User";
  const contact = [p.mobile || e.host?.email, p.city].filter(Boolean).join(" · ") || "—";
  const counts = e.user ? [
    ["events", (e.user.events || []).length],
    ["subscriptions", (e.user.subs || []).length],
    ["saved", (e.user.saved || []).length],
    ["check-ins", (e.user.checkIns || []).length],
  ] : [];

  async function setSusp(val) {
    const tasks = [];
    if (e.user) tasks.push(setUserSuspended(e.uid, val));
    if (e.host) tasks.push(setHostSuspended(e.uid, val));
    await Promise.all(tasks);
  }
  async function del() {
    const tasks = [];
    if (e.user) tasks.push(deleteUser(e.uid));
    if (e.host) tasks.push(deleteHost(e.uid));
    await Promise.all(tasks);
  }

  return (
    <div className="card" style={{ marginBottom: 14, opacity: e.suspended ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div className="av" style={{ flexShrink: 0 }}>{name.slice(0, 2).toUpperCase()}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <div style={{ fontWeight: 700, fontSize: ".95rem" }}>{name}</div>
            {e.isUser && <RoleTag kind="user" />}
            {e.isHost && <RoleTag kind="host" />}
            <SuspendBadge suspended={e.suspended} />
          </div>
          <div className="muted" style={{ marginTop: 3, fontSize: ".72rem" }}>{contact}</div>
          <div className="muted" style={{ marginTop: 2, fontSize: ".62rem", fontFamily: "var(--fm)" }}>uid: {e.uid}</div>
        </div>
      </div>

      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--bd)" }}>
          {e.isUser && (
            <>
              <div style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".5px", color: "var(--ink4)", textTransform: "uppercase" }}>App profile</div>
              <DetailGrid obj={p} skip={[]} />
              <div style={{ marginTop: 10, display: "flex", gap: 14, flexWrap: "wrap" }}>
                {counts.map(([lbl, n]) => (
                  <div key={lbl} style={{ fontSize: ".72rem" }}><b style={{ fontFamily: "var(--fm)" }}>{n}</b> <span className="muted">{lbl}</span></div>
                ))}
              </div>
            </>
          )}
          {e.isHost && (
            <div style={{ marginTop: e.isUser ? 14 : 0 }}>
              <div style={{ fontSize: ".6rem", fontWeight: 800, letterSpacing: ".5px", color: "var(--ink4)", textTransform: "uppercase" }}>Host account</div>
              <DetailGrid obj={e.host} skip={["id", "suspended"]} />
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setOpen((o) => !o)}>{open ? "Hide 360° info" : "360° info"}</button>
        <div style={{ flex: 1 }} />
        {e.suspended
          ? <button className="btn btn-p btn-sm" disabled={b} onClick={() => run(e.uid, () => setSusp(false))}><Icon name="check" size={13} stroke="#fff" /> {b ? "…" : "Unsuspend"}</button>
          : <button className="btn btn-ghost btn-sm" disabled={b} onClick={() => run(e.uid, () => setSusp(true))}><Icon name="clock" size={13} /> {b ? "…" : "Suspend"}</button>}
        <button className="btn btn-danger btn-sm" disabled={b} onClick={() => { if (confirm(`Delete ${name}'s data? (The Firebase Auth account itself needs server-side deletion.)`)) run(e.uid, del); }}><Icon name="trash" size={13} /> Delete</button>
      </div>
    </div>
  );
}

function Admins({ email }) {
  const [rows, setRows] = useState([]);
  const [f, setF] = useState({ email: "", role: "admin", modules: [] });
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => watchAdmins(setRows), []);

  const toggle = (id) => setF((x) => ({ ...x, modules: x.modules.includes(id) ? x.modules.filter((m) => m !== id) : [...x.modules, id] }));
  function editRow(a) { setF({ email: a.email, role: a.role || "admin", modules: a.modules || [] }); setEditing(true); }
  function reset() { setF({ email: "", role: "admin", modules: [] }); setEditing(false); }

  async function save() {
    const em = f.email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) return alert("Enter a valid email");
    setBusy(true);
    try {
      await saveAdmin(em, { role: f.role, modules: f.role === "super" ? ALL_MODULE_IDS : f.modules, addedBy: email });
      reset();
    } catch (e) { alert("Error: " + (e.message || e)); }
    setBusy(false);
  }
  async function remove(em) {
    if (!confirm(`Remove admin ${em}? They lose all access.`)) return;
    try { await removeAdmin(em); } catch (e) { alert("Error: " + (e.message || e)); }
  }

  return (
    <>
      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-h" style={{ marginBottom: 10 }}>
          <div className="ttl"><Icon name="gear" /> {editing ? `Edit ${f.email}` : "Add admin"}</div>
          {editing && <button className="btn btn-ghost btn-sm" onClick={reset}>Cancel edit</button>}
        </div>
        <div className="row" style={{ alignItems: "flex-end" }}>
          <div style={{ flex: 2 }}>
            <label className="label">Email</label>
            <input className="input" type="email" value={f.email} disabled={editing}
              onChange={(e) => setF((x) => ({ ...x, email: e.target.value }))} placeholder="admin@example.com" />
          </div>
          <div style={{ flex: 1 }}>
            <label className="label">Role</label>
            <select className="input" value={f.role} onChange={(e) => setF((x) => ({ ...x, role: e.target.value }))}>
              <option value="admin">Admin (module access)</option>
              <option value="super">Super admin (full)</option>
            </select>
          </div>
        </div>
        {f.role !== "super" && (
          <>
            <label className="label" style={{ marginTop: 12 }}>Module access</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {MODULES.map((m) => {
                const on = f.modules.includes(m.id);
                return (
                  <button key={m.id} type="button" onClick={() => toggle(m.id)}
                    className={`btn btn-sm ${on ? "btn-p" : "btn-ghost"}`}>
                    <Icon name={m.ic} size={13} stroke={on ? "#fff" : undefined} /> {m.label}
                  </button>
                );
              })}
            </div>
          </>
        )}
        <button className="btn btn-p" style={{ marginTop: 14 }} disabled={busy} onClick={save}>
          <Icon name="check" size={14} stroke="#fff" /> {busy ? "Saving…" : editing ? "Save changes" : "Add admin"}
        </button>
        <div className="muted" style={{ marginTop: 8, fontSize: ".7rem" }}>
          Owner emails (set in <code>NEXT_PUBLIC_ADMIN_EMAILS</code>) are always super-admins and don't appear below.
        </div>
      </div>

      <div className="card">
        <div className="card-h" style={{ marginBottom: 8 }}><div className="ttl"><Icon name="users" /> Admins · {rows.length}</div></div>
        {rows.length === 0 ? (
          <div className="empty"><Icon name="user" size={40} /><div style={{ marginTop: 10 }}>No added admins yet. Only owner accounts have access.</div></div>
        ) : rows.map((a) => (
          <div key={a.id} style={{ padding: "11px 0", borderBottom: "1px solid var(--bd)", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 700, fontSize: ".86rem", fontFamily: "var(--fm)" }}>{a.email}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                {a.role === "super"
                  ? <span style={{ fontSize: ".56rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--t1)", color: "var(--t7)" }}>SUPER · full access</span>
                  : (a.modules || []).length
                    ? (a.modules || []).map((m) => <span key={m} style={{ fontSize: ".56rem", fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "var(--bd)", color: "var(--ink2)" }}>{TITLES[m] || m}</span>)
                    : <span className="muted" style={{ fontSize: ".68rem" }}>no modules</span>}
              </div>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => editRow(a)}><Icon name="edit" size={13} /> Edit</button>
            <button className="btn btn-danger btn-sm" onClick={() => remove(a.email)}><Icon name="trash" size={13} /></button>
          </div>
        ))}
      </div>
    </>
  );
}

function Broadcast() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null); // {ok, text}
  const [confirm, setConfirm] = useState(false);

  async function send() {
    if (!title.trim()) { setMsg({ ok: false, text: "Enter a title" }); return; }
    setBusy(true); setMsg(null);
    try {
      await broadcastAll(title.trim(), body.trim());
      setMsg({ ok: true, text: "Announcement sent to all app users." });
      setTitle(""); setBody(""); setConfirm(false);
    } catch (e) {
      setMsg({ ok: false, text: String(e.message || e) });
    }
    setBusy(false);
  }

  return (
    <div className="card" style={{ maxWidth: 560 }}>
      <div className="h2" style={{ marginBottom: 4 }}>Send an announcement</div>
      <p className="muted" style={{ marginBottom: 14 }}>
        This sends a push notification to <b>every Invite Karoo app user</b> — not just one community. Use for app updates, festival greetings, or platform notices.
      </p>

      <label className="label">Title</label>
      <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Happy Durga Puja 🎉" maxLength={65} />

      <label className="label" style={{ marginTop: 12 }}>Message</label>
      <textarea className="input" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Optional message body…" maxLength={240} />

      {msg && <div className={msg.ok ? "" : "err"} style={{ marginTop: 12, color: msg.ok ? "#15803D" : undefined, fontWeight: 600, fontSize: ".82rem" }}>{msg.text}</div>}

      {!confirm ? (
        <button className="btn btn-p btn-block" style={{ marginTop: 16 }} disabled={busy} onClick={() => { if (!title.trim()) { setMsg({ ok: false, text: "Enter a title" }); return; } setMsg(null); setConfirm(true); }}>
          <Icon name="bell" size={15} stroke="#fff" /> Review &amp; send
        </button>
      ) : (
        <div style={{ marginTop: 16, padding: 14, border: "1px solid #FDE68A", background: "#FEF9EC", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Send to ALL app users?</div>
          <div className="muted" style={{ marginBottom: 12, fontSize: ".82rem" }}>“{title.trim()}”{body.trim() ? ` — ${body.trim()}` : ""}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="btn btn-p" disabled={busy} onClick={send}>{busy ? "Sending…" : "Yes, send to everyone"}</button>
            <button className="btn btn-ghost" disabled={busy} onClick={() => setConfirm(false)}>Cancel</button>
          </div>
        </div>
      )}
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
