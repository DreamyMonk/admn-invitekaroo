// Shared WhatsApp sender (whatapi.in / Meta Cloud API format). Used by the
// /api/whatsapp, OTP, notify and broadcast routes. Credentials in Vercel env.
export async function sendWhatsAppTemplate({ to, template, language = "en", bodyVars = [], buttonVar }) {
  const token = process.env.WHATAPI_ACCESS_TOKEN;
  const base = process.env.WHATAPI_API_URL;
  const ver = process.env.WHATAPI_API_VERSION || "v19.0";
  const pnid = process.env.WHATAPI_PHONE_NUMBER_ID;
  if (!token || !base || !pnid) return { ok: false, error: "WhatsApp API not configured" };

  const components = [];
  if (Array.isArray(bodyVars) && bodyVars.length) {
    components.push({ type: "body", parameters: bodyVars.map((t) => ({ type: "text", text: String(t ?? "") })) });
  }
  if (buttonVar != null && buttonVar !== "") {
    components.push({
      type: "button",
      sub_type: "url",
      index: "0",
      parameters: [{ type: "text", text: String(buttonVar) }],
    });
  }
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: normalizePhone(to),
    type: "template",
    template: { name: template, language: { code: language }, ...(components.length ? { components } : {}) },
  };
  try {
    const r = await fetch(`${base.replace(/\/$/, "")}/${ver}/${pnid}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, error: j?.error?.message || j?.message || `HTTP ${r.status}`, raw: j };
    return { ok: true, id: j?.messages?.[0]?.id || null };
  } catch (e) {
    return { ok: false, error: String(e?.message || e) };
  }
}

// Digits only, default India country code if a bare 10-digit number is given.
export function normalizePhone(raw) {
  let s = String(raw || "").replace(/[^0-9]/g, "");
  if (s.length === 10) s = "91" + s;
  return s;
}

// Fan out a template to many numbers, in small concurrent batches.
export async function sendWhatsAppBulk(numbers, build) {
  const uniq = Array.from(new Set((numbers || []).map(normalizePhone).filter((n) => n.length >= 11)));
  let sent = 0;
  const size = 10;
  for (let i = 0; i < uniq.length; i += size) {
    const batch = uniq.slice(i, i + size);
    const res = await Promise.all(batch.map((to) => sendWhatsAppTemplate({ to, ...build(to) })));
    sent += res.filter((r) => r && r.ok).length;
  }
  return { total: uniq.length, sent };
}
