"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API;

export default function Subleaser() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState(null);
  const [form, setForm] = useState({ title: "", details: "" });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    const t = sessionStorage.getItem("sl_token");
    if (t) setToken(t);
    else window.location.replace("/login");
  }, []);

  const logout = () => {
    sessionStorage.removeItem("sl_token");
    window.location.replace("/login");
  };

  const headers = { "x-session": token, "Content-Type": "application/json" };
  const loadMe = () =>
    fetch(`${API}/subleaser/me`, { headers }).then(async r => (r.status === 401 ? logout() : setMe(await r.json())));
  useEffect(() => { if (token) loadMe(); }, [token]);

  async function fileComplaint(e) {
    e.preventDefault();
    setMsg("");
    const r = await fetch(`${API}/subleaser/complaints`, { method: "POST", headers, body: JSON.stringify(form) });
    if (r.status === 401) return logout();
    if (!r.ok) return setMsg("Couldn't send. Add a short title (3+ characters).");
    setForm({ title: "", details: "" });
    setMsg("Complaint sent to your owner.");
    loadMe();
  }

  if (!token) return null;
  const owing = (me?.bills || []).filter(b => !b.paid).reduce((t, b) => t + b.amount, 0);

  return (
    <>
      <header className="dash-bar">
        <Link href="/" className="brand">CampusNest</Link>
        <span>Hi {me?.name || "there"}</span>
        <button className="reset sl-out" onClick={logout}>Log out</button>
      </header>

      <div className="sl-portal">
        {me && !me.profile && (
          <div className="panel"><h2>Waiting for your owner</h2>
            <p className="hint">No room is linked to {me.email} yet. Ask your owner to add you under Subleasers using this email.</p></div>
        )}

        {me?.profile && (
          <div className="sl-grid">
            <section className="panel">
              <h2>Your room</h2>
              <p className="v">{me.room?.title ?? "No room assigned yet"}</p>
              <p className="k">{me.room ? `${me.room.suburb}, $${me.room.rent}/week` : ""}</p>
              <p className="k">Status: <span className={`pill ${me.profile.status}`}>{me.profile.status}</span>{me.profile.move_in ? `, moved in ${me.profile.move_in}` : ""}</p>
              {me.profile.lease_url && <a className="link" href={me.profile.lease_url} target="_blank" rel="noreferrer">Open my lease</a>}
            </section>

            <section className="panel">
              <h2>Bills</h2>
              <p className="v">{owing > 0 ? `$${owing.toFixed(2)} outstanding` : "All paid up"}</p>
              <ul className="rows">
                {me.bills.map(b => (
                  <li key={b.id}>
                    <div><p className="v">{b.description}, ${b.amount.toFixed(2)}</p><p className="k">Due {b.due || "no date"}</p></div>
                    <span className={b.paid ? "pill active" : "pill open"}>{b.paid ? "Paid" : "Due"}</span>
                  </li>
                ))}
              </ul>
            </section>

            <form className="panel form" onSubmit={fileComplaint}>
              <h2>Report a problem</h2>
              <label className="field"><span>What's wrong?</span><input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="Leaking tap in kitchen" required /></label>
              <label className="field"><span>Details (optional)</span><input value={form.details} onChange={e => setForm({ ...form, details: e.target.value })} /></label>
              {msg && <p className="note">{msg}</p>}
              <button className="primary">Send to owner</button>
            </form>

            <section className="panel">
              <h2>Your complaints</h2>
              <ul className="rows">
                {me.complaints.map(c => (
                  <li key={c.id}>
                    <div><p className="v">{c.title}</p><p className="k">{c.created}</p></div>
                    <span className={`pill ${c.status}`}>{c.status.replace("_", " ")}</span>
                  </li>
                ))}
                {me.complaints.length === 0 && <p className="hint">Nothing reported.</p>}
              </ul>
            </section>
          </div>
        )}
      </div>
    </>
  );
}