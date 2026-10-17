"use client";
import { useEffect, useState } from "react";

export const API = process.env.NEXT_PUBLIC_API;

const TYPES = [
  ["female_only", "Female only"],
  ["female_preferred", "Female preferred"],
  ["male_preferred", "Male preferred"],
  ["any", "Any gender"],
];
const today = () => new Date().toISOString().slice(0, 10);
const nameOf = (subs, id) => subs.find(s => s.id === id)?.name ?? "Unassigned";

export function useTable(table, pw) {
  const [rows, setRows] = useState([]);
  const headers = { "Content-Type": "application/json", "x-owner-password": pw };
  const load = () => fetch(`${API}/owner/${table}`, { headers }).then(r => r.json()).then(setRows).catch(() => {});
  useEffect(() => { load(); }, [table]);
  const send = (method, path, body) =>
    fetch(`${API}/owner/${table}${path}`, { method, headers, body: body && JSON.stringify(body) }).then(load);
  return {
    rows,
    add: b => send("POST", "", b),
    patch: (id, b) => send("PATCH", `/${id}`, b),
    remove: id => send("DELETE", `/${id}`),
  };
}

const Field = ({ label, children }) => (
  <label className="field"><span>{label}</span>{children}</label>
);

function SubSelect({ subs, value, onChange, required }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)} required={required}>
      <option value="">Choose a subleaser</option>
      {subs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
  );
}

/* ---------- Listings ---------- */
export function ListingsView({ pw, onExpired }) {
  const [suburbs, setSuburbs] = useState([]);
  const [items, setItems] = useState([]);
  const empty = { title: "", suburb: "", rent: "", household: "any" };
  const [form, setForm] = useState(empty);
  const [msg, setMsg] = useState("");

  const load = () => fetch(`${API}/listings`).then(r => r.json()).then(setItems);
  useEffect(() => {
    load();
    fetch(`${API}/suburbs`).then(r => r.json()).then(setSuburbs);
  }, []);

  async function add(e) {
    e.preventDefault();
    const r = await fetch(`${API}/listings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-owner-password": pw },
      body: JSON.stringify({ ...form, rent: Number(form.rent) }),
    });
    if (r.status === 401) return onExpired();
    if (!r.ok) return setMsg("Couldn't save. Check the title (3+ characters) and rent.");
    setForm(empty);
    setMsg("Listing added. Students can see it now.");
    load();
  }

  async function remove(id, title) {
    if (!window.confirm(`Delete "${title}"?`)) return;
    const r = await fetch(`${API}/listings/${id}`, { method: "DELETE", headers: { "x-owner-password": pw } });
    if (r.status === 401) return onExpired();
    load();
  }

  return (
    <div className="owner-grid">
      <form className="panel form" onSubmit={add}>
        <h2>Add a listing</h2>
        <Field label="Title">
          <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Sunny room near the station" required />
        </Field>
        <Field label="Suburb">
          <select value={form.suburb} onChange={e => setForm({ ...form, suburb: e.target.value })} required>
            <option value="">Choose a suburb</option>
            {suburbs.map(s => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Rent per week ($)">
          <input type="number" min="1" max="4999" value={form.rent} onChange={e => setForm({ ...form, rent: e.target.value })} required />
        </Field>
        <Field label="Who lives here">
          <select value={form.household} onChange={e => setForm({ ...form, household: e.target.value })}>
            {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        {msg && <p className="note">{msg}</p>}
        <button className="primary">Add listing</button>
      </form>

      <section>
        <h2 className="count">{items.length} {items.length === 1 ? "listing" : "listings"}</h2>
        <ul className="rows">
          {items.map(l => (
            <li key={l.id}>
              <div>
                <p className="v">{l.title}</p>
                <p className="k">{l.suburb}, ${l.rent}/week, {TYPES.find(t => t[0] === l.household)?.[1]}</p>
              </div>
              <button className="danger" onClick={() => remove(l.id, l.title)}>Delete</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Subleasers: onboarding/offboarding, lease documents, track complaints ---------- */
export function SubleasersView({ pw, mode }) {
  const subs = useTable("subleasers", pw);
  const cmp = useTable("complaints", pw);
  const [listings, setListings] = useState([]);
  const empty = { name: "", email: "", phone: "", listing_id: "", move_in: today() };
  const [form, setForm] = useState(empty);
  const [pick, setPick] = useState("");
  useEffect(() => { fetch(`${API}/listings`).then(r => r.json()).then(setListings); }, []);

  async function add(e) {
    e.preventDefault();
    await subs.add({ ...form, listing_id: form.listing_id ? Number(form.listing_id) : null, status: "onboarding" });
    setForm(empty);
  }

  if (mode === "leases") {
    return (
      <section>
        <h2 className="count">Lease documents</h2>
        <p className="hint">Paste a link to each lease (Google Drive, Dropbox, etc.). File upload comes later.</p>
        <ul className="rows">
          {subs.rows.map(s => (
            <li key={s.id}>
              <div className="grow">
                <p className="v">{s.name}</p>
                <input className="inline" defaultValue={s.lease_url || ""} placeholder="https://..."
                  onBlur={e => e.target.value !== (s.lease_url || "") && subs.patch(s.id, { lease_url: e.target.value })} />
              </div>
              {s.lease_url && <a className="link" href={s.lease_url} target="_blank" rel="noreferrer">Open</a>}
            </li>
          ))}
          {subs.rows.length === 0 && <p className="hint">Add a subleaser under Onboarding / Offboarding first.</p>}
        </ul>
      </section>
    );
  }

  if (mode === "complaints") {
    const list = cmp.rows.filter(c => String(c.subleaser_id) === pick);
    return (
      <section>
        <h2 className="count">Track complaints by subleaser</h2>
        <div className="narrow-select"><SubSelect subs={subs.rows} value={pick} onChange={setPick} /></div>
        <ul className="rows">
          {pick && list.length === 0 && <p className="hint">No complaints for this subleaser.</p>}
          {list.map(c => (
            <li key={c.id}>
              <div>
                <p className="v">{c.title}</p>
                <p className="k">{c.created}{c.details ? `, ${c.details}` : ""}</p>
              </div>
              <span className={`pill ${c.status}`}>{c.status.replace("_", " ")}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="owner-grid">
      <form className="panel form two" onSubmit={add}>
        <h2>Onboard a subleaser</h2>
        <p className="sub">Add the tenant, assign a room and set their move-in date.</p>
        <Field label="Name"><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></Field>
        <Field label="Email"><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Phone"><input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Room">
          <select value={form.listing_id} onChange={e => setForm({ ...form, listing_id: e.target.value })}>
            <option value="">Not assigned</option>
            {listings.map(l => <option key={l.id} value={l.id}>{l.title}</option>)}
          </select>
        </Field>
        <Field label="Move-in date"><input type="date" value={form.move_in} onChange={e => setForm({ ...form, move_in: e.target.value })} /></Field>
        <button className="primary">Add subleaser</button>
      </form>

      <section>
        <h2 className="count">{subs.rows.length} {subs.rows.length === 1 ? "subleaser" : "subleasers"}</h2>
        <ul className="rows">
          {subs.rows.map(s => (
            <li key={s.id}>
              <div>
                <p className="v">{s.name} <span className={`pill ${s.status}`}>{s.status}</span></p>
                <p className="k">
                  {listings.find(l => l.id === s.listing_id)?.title ?? "No room assigned"}
                  {s.move_in ? `, in ${s.move_in}` : ""}{s.move_out ? `, out ${s.move_out}` : ""}
                </p>
              </div>
              <div className="actions">
                {s.status === "onboarding" && <button className="reset" onClick={() => subs.patch(s.id, { status: "active" })}>Mark moved in</button>}
                {s.status === "active" && <button className="reset" onClick={() => subs.patch(s.id, { status: "offboarded", move_out: today() })}>Offboard</button>}
                <button className="danger" onClick={() => window.confirm(`Delete ${s.name}?`) && subs.remove(s.id)}>Delete</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Bills and management ---------- */
export function BillsView({ pw }) {
  const bills = useTable("bills", pw);
  const subs = useTable("subleasers", pw);
  const empty = { subleaser_id: "", description: "", amount: "", due: today() };
  const [form, setForm] = useState(empty);
  const owing = bills.rows.filter(b => !b.paid).reduce((t, b) => t + b.amount, 0);

  async function add(e) {
    e.preventDefault();
    await bills.add({ ...form, subleaser_id: Number(form.subleaser_id), amount: Number(form.amount) });
    setForm(empty);
  }

  return (
    <div className="owner-grid">
      <form className="panel form" onSubmit={add}>
        <h2>Create a bill</h2>
        <Field label="Subleaser"><SubSelect subs={subs.rows} value={form.subleaser_id} onChange={v => setForm({ ...form, subleaser_id: v })} required /></Field>
        <Field label="What for"><input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Rent, electricity, internet..." required /></Field>
        <Field label="Amount ($)"><input type="number" min="0" step="0.01" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} required /></Field>
        <Field label="Due date"><input type="date" value={form.due} onChange={e => setForm({ ...form, due: e.target.value })} /></Field>
        <button className="primary">Create bill</button>
      </form>

      <section>
        <h2 className="count">Outstanding: ${owing.toFixed(2)}</h2>
        <ul className="rows">
          {bills.rows.map(b => (
            <li key={b.id}>
              <div>
                <p className="v">{b.description}, ${b.amount.toFixed(2)}</p>
                <p className="k">{nameOf(subs.rows, b.subleaser_id)}, due {b.due || "no date"}</p>
              </div>
              <div className="actions">
                <button className={b.paid ? "pill active" : "pill open"} onClick={() => bills.patch(b.id, { paid: b.paid ? 0 : 1 })}>
                  {b.paid ? "Paid" : "Mark paid"}
                </button>
                <button className="danger" onClick={() => bills.remove(b.id)}>Delete</button>
              </div>
            </li>
          ))}
          {bills.rows.length === 0 && <p className="hint">No bills yet.</p>}
        </ul>
      </section>
    </div>
  );
}

/* ---------- Complaints ---------- */
export function ComplaintsView({ pw }) {
  const cmp = useTable("complaints", pw);
  const subs = useTable("subleasers", pw);
  const empty = { subleaser_id: "", title: "", details: "" };
  const [form, setForm] = useState(empty);

  async function add(e) {
    e.preventDefault();
    await cmp.add({ ...form, subleaser_id: form.subleaser_id ? Number(form.subleaser_id) : null });
    setForm(empty);
  }

  return (
    <div className="owner-grid">
      <form className="panel form" onSubmit={add}>
        <h2>Log a complaint</h2>
        <Field label="From"><SubSelect subs={subs.rows} value={form.subleaser_id} onChange={v => setForm({ ...form, subleaser_id: v })} /></Field>
        <Field label="Issue"><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Leaking tap in kitchen" required /></Field>
        <Field label="Details"><input value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} /></Field>
        <button className="primary">Log complaint</button>
      </form>

      <section>
        <h2 className="count">{cmp.rows.filter(c => c.status !== "resolved").length} open</h2>
        <ul className="rows">
          {cmp.rows.map(c => (
            <li key={c.id}>
              <div>
                <p className="v">{c.title}</p>
                <p className="k">{nameOf(subs.rows, c.subleaser_id)}, {c.created}{c.details ? `, ${c.details}` : ""}</p>
              </div>
              <div className="actions">
                <select className={`pill ${c.status}`} value={c.status} onChange={e => cmp.patch(c.id, { status: e.target.value })}>
                  <option value="open">open</option>
                  <option value="in_progress">in progress</option>
                  <option value="resolved">resolved</option>
                </select>
                <button className="danger" onClick={() => cmp.remove(c.id)}>Delete</button>
              </div>
            </li>
          ))}
          {cmp.rows.length === 0 && <p className="hint">No complaints logged.</p>}
        </ul>
      </section>
    </div>
  );
}

/* ---------- User / Profile ---------- */
export function ProfileView({ onLogout }) {
  return (
    <section className="panel form narrow">
      <h2>Profile</h2>
      <p><span className="k">Username</span><br /><span className="v">admin</span></p>
      <p><span className="k">Role</span><br /><span className="v">Lease owner</span></p>
      <p className="hint">To change the password, set the OWNER_PASSWORD environment variable before starting the backend.</p>
      <button className="reset" onClick={onLogout}>Log out</button>
    </section>
  );
}