"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";

const API = process.env.NEXT_PUBLIC_API;
const GID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export default function Login() {
  const [role, setRole] = useState("student");
  const [google, setGoogle] = useState(null); // null = still checking
  const [demo, setDemo] = useState({ name: "", email: "" });
  const [creds, setCreds] = useState({ username: "", password: "" });
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const btn = useRef(null);

  useEffect(() => {
    fetch(`${API}/subleaser/config`).then(r => r.json()).then(c => setGoogle(c.google && !!GID)).catch(() => setGoogle(false));
  }, []);

  const post = (path, body) =>
    fetch(`${API}${path}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);

  async function studentLogin(body) {
    setError("");
    setBusy(true);
    const r = await post("/subleaser/login", body);
    setBusy(false);
    if (!r) return setError("Can't reach the backend. Is uvicorn running on port 8000?");
    if (!r.ok) return setError((await r.json()).detail || "Sign-in failed");
    sessionStorage.setItem("sl_token", (await r.json()).token);
    window.location.href = "/subleaser";
  }

  async function ownerLogin(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const r = await post("/owner/login", creds);
    setBusy(false);
    if (!r) return setError("Can't reach the backend. Is uvicorn running on port 8000?");
    if (!r.ok) return setError("Wrong username or password.");
    sessionStorage.setItem("owner_pw", creds.password);
    window.location.href = "/owner";
  }

  useEffect(() => {
    if (!google || role !== "student" || !btn.current) return;
    const init = () => {
      window.google.accounts.id.initialize({ client_id: GID, callback: res => studentLogin({ credential: res.credential }) });
      window.google.accounts.id.renderButton(btn.current, { theme: "outline", size: "large", width: 320, text: "continue_with" });
    };
    if (window.google?.accounts) return init();
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, [google, role]);

  const pick = r => { setRole(r); setError(""); };

  return (
    <div className="login">
      <aside className="login-side">
        <Link href="/" className="brand">CampusNest</Link>
        <div>
          <h1>Your one stop for student rentals.</h1>
          <ul>
            <li>Students: see your room, bills and requests</li>
            <li>Owners: manage listings, subleasers and leases</li>
            <li>Everyone: one place, one login</li>
          </ul>
        </div>
        <p className="login-foot">Log in to continue</p>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <h2>Log in</h2>
          <div className="role-tabs" role="tablist">
            <button role="tab" aria-selected={role === "student"} className={role === "student" ? "on" : ""} onClick={() => pick("student")}>Student / subleaser</button>
            <button role="tab" aria-selected={role === "owner"} className={role === "owner" ? "on" : ""} onClick={() => pick("owner")}>Lease owner</button>
          </div>

          {role === "student" && (
            <>
              <p className="hint">Sign in with Google to see your room, bills and complaints.</p>
              {google === true && <div ref={btn} className="gbtn" />}
              {google === false && (
                <form onSubmit={e => { e.preventDefault(); studentLogin({ demo_name: demo.name, demo_email: demo.email }); }}>
                  <p className="demo-note">Demo sign-in. Use the email your owner added you with. Google sign-in turns on once a Client ID is set.</p>
                  <label className="field"><span>Name</span><input value={demo.name} onChange={e => setDemo({ ...demo, name: e.target.value })} required /></label>
                  <label className="field"><span>Email</span><input type="email" value={demo.email} onChange={e => setDemo({ ...demo, email: e.target.value })} required /></label>
                  <button className="primary" disabled={busy}>{busy ? "Signing in..." : "Continue"}</button>
                </form>
              )}
            </>
          )}

          {role === "owner" && (
            <form onSubmit={ownerLogin}>
              <p className="hint">Sign in to manage your listings and subleasers.</p>
              <label className="field"><span>Username</span><input value={creds.username} onChange={e => setCreds({ ...creds, username: e.target.value })} autoComplete="username" required /></label>
              <label className="field"><span>Password</span>
                <div className="pwrow">
                  <input type={show ? "text" : "password"} value={creds.password} onChange={e => setCreds({ ...creds, password: e.target.value })} autoComplete="current-password" required />
                  <button type="button" onClick={() => setShow(!show)}>{show ? "Hide" : "Show"}</button>
                </div>
              </label>
              <button className="primary" disabled={busy}>{busy ? "Signing in..." : "Log in"}</button>
            </form>
          )}

          {error && <p className="error" role="alert">{error}</p>}
          <Link href="/" className="back">Back to room search</Link>
        </div>
      </main>
    </div>
  );
}