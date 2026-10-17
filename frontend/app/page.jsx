"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import "./home.css";
import { GeoPicker } from "./geo";

const API = process.env.NEXT_PUBLIC_API;

const HOUSEHOLD = {
  female_only: { label: "Female only", cls: "f1", icon: "shield", tip: "Only female tenants live here" },
  female_preferred: { label: "Female preferred", cls: "f2", icon: "shield-line", tip: "Female tenants preferred" },
  male_preferred: { label: "Male preferred", cls: "m", icon: "person", tip: "Male tenants preferred" },
  any: { label: "Any gender", cls: "a", icon: "people", tip: "Open to all students" },
};

const COVERS = [
  "linear-gradient(155deg,#6d4fd0,#2a1a6e)", "linear-gradient(155deg,#0e7c7b,#14354a)",
  "linear-gradient(155deg,#8b5fd6,#c2527f)", "linear-gradient(155deg,#2f5fb3,#1b1650)",
  "linear-gradient(155deg,#137a45,#0e4a4a)", "linear-gradient(155deg,#a0509a,#3a1f7a)",
];

const P = {
  heart: <path d="M12 21s-8-5.4-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.6-8 11-8 11z" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  star: <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />,
  undo: <path d="M9 14L4 9l5-5M4 9h10a6 6 0 010 12h-3" />,
  moon: <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />,
  sun: <g><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></g>,
  house: <path d="M3 11l9-8 9 8M5 10v10h14V10M10 20v-6h4v6" />,
  pin: <g><path d="M12 21s7-6.2 7-12a7 7 0 10-14 0c0 5.8 7 12 7 12z" /><circle cx="12" cy="9" r="2.5" /></g>,
  train: <g><rect x="5" y="3" width="14" height="14" rx="3" /><path d="M5 11h14M8 21l2-4M16 21l-2-4" /></g>,
  shield: <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />,
  "shield-line": <path d="M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z" />,
  person: <g><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></g>,
  people: <g><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-3.5 3-5 6-5s6 1.5 6 5M15 15.2c3 0 6 1.3 6 4.8" /></g>,
};
const filled = ["heart", "star", "shield"];
const Ic = ({ n, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled.includes(n) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{P[n]}</svg>
);

// 0-99: closer to the train, closer to campus and cheaper = higher
const fit = l => {
  const walk = Math.max(0, 40 - l.walk_min * 3);
  const near = l.campus_km !== undefined ? Math.max(0, 40 - l.campus_km * 4) : 20;
  const value = Math.max(0, Math.min(20, (400 - l.rent) / 12));
  return Math.round(Math.min(99, walk + near + value));
};

const parts = l => ({
  transport: Math.max(0, Math.round(100 - l.walk_min * 7)),
  campus: l.campus_km !== undefined ? Math.max(0, Math.round(100 - l.campus_km * 10)) : null,
  value: Math.max(0, Math.min(100, Math.round((400 - l.rent) / 2.5))),
});

const reasons = (l, campusName) => [
  l.walk_min <= 10 && `${l.walk_min} min to ${l.station}`,
  l.campus_km !== undefined && l.campus_km <= 5 && `${l.campus_km} km to ${(campusName || "campus").split(" ")[0]}`,
  l.household.startsWith("female") && "Female-friendly",
  l.rent <= 260 && "Great value",
].filter(Boolean);

function RoomArt() {
  return (
    <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <rect width="400" height="200" className="r-wall" />
      <rect y="150" width="400" height="50" className="r-floor" />
      <rect x="262" y="26" width="100" height="80" rx="6" className="r-win" />
      <path d="M312 26v80M262 66h100" className="r-winline" />
      <rect x="36" y="82" width="46" height="70" rx="8" className="r-head" />
      <rect x="36" y="106" width="178" height="46" rx="8" className="r-bed" />
      <rect x="92" y="92" width="52" height="22" rx="10" className="r-pillow" />
      <rect x="44" y="152" width="8" height="14" className="r-leg" />
      <rect x="198" y="152" width="8" height="14" className="r-leg" />
      <path d="M244 152v-40" className="r-lamp" />
      <path d="M230 112h28l-6-20h-16z" className="r-shade" />
      <rect x="338" y="124" width="26" height="28" rx="5" className="r-pot" />
      <path d="M351 124c-14-8-16-26-6-34 6 8 10 18 6 34zM351 124c14-6 18-22 10-32-8 8-12 18-10 32z" className="r-leaf" />
    </svg>
  );
}

const FLOATERS = [
  { n: "house", x: "6%", size: 34, d: "26s", delay: "0s", s: 1, c: "#8b5fd6" },
  { n: "train", x: "18%", size: 30, d: "32s", delay: "-12s", s: 0.9, c: "#0e9f9a" },
  { n: "pin", x: "31%", size: 28, d: "28s", delay: "-20s", s: 1.1, c: "#d9569a" },
  { n: "house", x: "58%", size: 30, d: "34s", delay: "-8s", s: 0.9, c: "#0e9f9a" },
  { n: "pin", x: "72%", size: 36, d: "30s", delay: "-24s", s: 1, c: "#8b5fd6" },
  { n: "train", x: "88%", size: 32, d: "27s", delay: "-16s", s: 1, c: "#d9569a" },
];

function Backdrop() {
  return (
    <div className="nest-bg" aria-hidden="true">
      <span className="blob b1" /><span className="blob b2" /><span className="blob b3" />
      {FLOATERS.map((f, i) => (
        <span key={i} className="floater" style={{ left: f.x, animationDuration: f.d, animationDelay: f.delay, scale: f.s, "--fc": f.c }}>
          <Ic n={f.n} size={f.size} />
        </span>
      ))}
    </div>
  );
}

function SafetyHelp() {
  return (
    <details className="help">
      <summary>Safety and support</summary>
      <p className="hint">In danger now? Call 000.</p>
      <ul>
        <li><a href="tel:000">Emergency (Triple Zero)</a><span>000</span></li>
        <li><a href="tel:131444">Police Assistance Line</a><span>131 444</span></li>
        <li><a href="tel:1800737732">1800RESPECT</a><span>1800 737 732</span></li>
        <li><a href="tel:131114">Lifeline</a><span>13 11 14</span></li>
      </ul>
      <p className="hint">Inspect rooms in daylight and bring a friend. Never pay a bond or rent before you've seen the room.</p>
    </details>
  );
}

function Card({ l, campusName, behind, leaving, onDecide }) {
  const [d, setD] = useState({ x: 0, y: 0, on: false });
  const o = useRef(null);
  const h = HOUSEHOLD[l.household];
  const why = reasons(l, campusName);
  const b = parts(l);
  const month = Math.round((l.rent * 52) / 12);
  const commute = l.campus_km !== undefined ? Math.round(l.walk_min + 8 + l.campus_km * 3) : null;

  const down = e => {
    if (behind || leaving) return;
    o.current = [e.clientX, e.clientY];
    e.currentTarget.setPointerCapture(e.pointerId);
    setD({ x: 0, y: 0, on: true });
  };
  const move = e => o.current && setD({ x: e.clientX - o.current[0], y: Math.min(0, e.clientY - o.current[1]), on: true });
  const up = () => {
    if (!o.current) return;
    o.current = null;
    if (d.y < -120 && Math.abs(d.x) < 100) return onDecide("star");
    if (d.x > 120) return onDecide("save");
    if (d.x < -120) return onDecide("pass");
    setD({ x: 0, y: 0, on: false });
  };

  let style;
  if (leaving === "star") style = { transform: "translateY(-120%)", opacity: 0 };
  else if (leaving) { const s = leaving === "save" ? 1 : -1; style = { transform: `translateX(${s * 130}%) rotate(${s * 16}deg)`, opacity: 0 }; }
  else if (!behind) style = { transform: `translate(${d.x}px, ${d.y}px) rotate(${d.x / 22}deg)` };

  const op = k => leaving === k ? 1 : k === "save" ? Math.min(1, Math.max(0, d.x / 90)) : k === "pass" ? Math.min(1, Math.max(0, -d.x / 90)) : Math.min(1, Math.max(0, -d.y / 90));

  return (
    <article className={`nest-card${behind ? " behind" : ""}${!d.on ? " settle" : ""}`} style={style}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
      <span className="nest-stamp save" style={{ opacity: op("save") }}>SAVE</span>
      <span className="nest-stamp pass" style={{ opacity: op("pass") }}>PASS</span>
      <span className="nest-stamp star" style={{ opacity: op("star") }}>TOP PICK</span>

      <div className="nest-cover" style={{ backgroundColor: "#2a1a6e", backgroundImage: `radial-gradient(circle at 85% 12%, rgba(255,255,255,.2), transparent 45%), ${COVERS[l.id % COVERS.length]}` }}>
        <span className={`tag ${h.cls}`} title={h.tip}><Ic n={h.icon} size={14} />{h.label}</span>
        <div className="fit" style={{ "--p": l.score }} title="How well this room fits your needs"><span>{l.score}<small>fit</small></span></div>
        <div>
          <p className="nest-sub">{l.suburb}</p>
          <p className="nest-rent">${l.rent} <span>/ week, about ${month.toLocaleString()} a month</span></p>
        </div>
      </div>

      <div className="nest-body">
        <h2>{l.title}</h2>
        {why.length > 0 && <div className="why">{why.map(w => <span key={w}>{w}</span>)}</div>}

        <div className="blocks">
          <div className="blk">
            <p className="q">Getting around</p>
            <p className={l.walk_min <= 10 ? "a ok" : "a"}>{l.walk_min} min walk</p>
            <p className="s">to {l.station}</p>
          </div>
          <div className="blk">
            <p className="q">Distance to campus</p>
            {l.campus_km !== undefined
              ? <><p className="a">{l.campus_km} km</p><p className="s">about {commute} min door to door</p></>
              : <p className="s">Pick your campus to see this.</p>}
          </div>
        </div>

        {l.safety !== undefined && (
          <div className="safe-row" title="Built from police and transport distance and who lives there. It is not a crime or street lighting rating.">
            <div className="safe-score"><b>{l.safety}</b><small>safety fit</small></div>
            <div>
              <p className="s"><b>{l.police_min} min walk</b> to {l.police}</p>
              <p className="s">{l.modes?.length ? `${l.modes.join(", ")} within 10 min walk` : "No transport within 10 min walk"}</p>
            </div>
          </div>
        )}

        <div className="bars">
          <p className="q">Why it scores {l.score}</p>
          {[["Transport", b.transport], ["Campus", b.campus], ["Value", b.value]].map(([name, v]) => (
            <div className="bar" key={name}>
              <span>{name}</span>
              <i><b style={{ width: `${v ?? 0}%` }} /></i>
              <em>{v === null ? "Pick campus" : v}</em>
            </div>
          ))}
        </div>

        <div className="photo">
          {l.photo ? <img src={`${API}${l.photo}`} alt={l.title} /> : <RoomArt />}
          {!l.photo && <span className="photo-tag">Room photos coming soon</span>}
        </div>
      </div>
    </article>
  );
}

export default function Home() {
  const [campuses, setCampuses] = useState([]);
  const [campus, setCampus] = useState("");
  const [women, setWomen] = useState("all"); // all | friendly | only
  const [transport, setTransport] = useState(false);
  const [policeNear, setPoliceNear] = useState(false);
  const [maxRent, setMaxRent] = useState(400);
  const [showFilters, setShowFilters] = useState(true);
  const [showMap, setShowMap] = useState(true);
  const [items, setItems] = useState([]);
  const [passed, setPassed] = useState([]);
  const [saved, setSaved] = useState([]);
  const [history, setHistory] = useState([]);
  const [leaving, setLeaving] = useState(null);
  const [error, setError] = useState("");
  const [dark, setDark] = useState(false);

  useEffect(() => {
    try { setSaved(JSON.parse(localStorage.getItem("nest_saved") || "[]")); } catch {}
    fetch(`${API}/campuses`).then(r => r.json()).then(setCampuses)
      .catch(() => setError("Can't reach the backend. Start it with: uvicorn main:app --reload --port 8000"));
  }, []);
  useEffect(() => { try { localStorage.setItem("nest_saved", JSON.stringify(saved)); } catch {} }, [saved]);

  useEffect(() => {
    const s = localStorage.getItem("nest_theme");
    setDark(s ? s === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? "dark" : "light";
    return () => { delete document.documentElement.dataset.theme; };
  }, [dark]);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    try { localStorage.setItem("nest_theme", next ? "dark" : "light"); } catch {}
  };

  useEffect(() => {
    const q = new URLSearchParams();
    if (campus) q.set("campus", campus);
    if (women === "only") q.set("household", "female_only");
    else if (women === "friendly") q.set("household", "female_only,female_preferred");
    if (transport) q.set("walk_max", "10");
    if (policeNear) q.set("police_max", "15");
    if (maxRent < 400) q.set("max_rent", String(maxRent));
    fetch(`${API}/listings?${q}`).then(r => r.json()).then(setItems).catch(() => {});
  }, [campus, women, transport, policeNear, maxRent]);

  const deck = items
    .filter(l => !passed.includes(l.id) && !saved.some(s => s.id === l.id))
    .map(l => ({ ...l, score: fit(l) }))
    .sort((a, b) => (women !== "all" ? (b.safety ?? 0) - (a.safety ?? 0) || b.score - a.score : b.score - a.score));
  const current = deck[0];
  const campusName = campuses.find(c => c.id === campus)?.name;
  const seen = items.length - deck.length;

  const decide = useCallback(dir => {
    if (!current || leaving) return;
    const l = current;
    setLeaving(dir);
    setTimeout(() => {
      if (dir === "pass") setPassed(p => [...p, l.id]);
      else setSaved(s => [...s, { ...l, star: dir === "star" }]);
      setHistory(h => [...h, { id: l.id, dir }]);
      setLeaving(null);
    }, 260);
  }, [current, leaving]);

  const undo = useCallback(() => {
    const last = history[history.length - 1];
    if (!last || leaving) return;
    setHistory(h => h.slice(0, -1));
    if (last.dir === "pass") setPassed(p => p.filter(i => i !== last.id));
    else setSaved(s => s.filter(x => x.id !== last.id));
  }, [history, leaving]);

  useEffect(() => {
    const onKey = e => {
      if (["INPUT", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") decide("save");
      if (e.key === "ArrowLeft") decide("pass");
      if (e.key === "ArrowUp") { e.preventDefault(); decide("star"); }
      if (e.key.toLowerCase() === "z") undo();
      if (e.key.toLowerCase() === "f") { const hide = showFilters || showMap; setShowFilters(!hide); setShowMap(!hide); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, undo, showFilters, showMap]);

  const reset = () => { setCampus(""); setWomen("all"); setTransport(false); setPoliceNear(false); setMaxRent(400); setPassed([]); setHistory([]); };
  const shortlist = [...saved].sort((a, b) => Number(!!b.star) - Number(!!a.star));

  return (
    <div className="nest">
      <Backdrop />
      <header className="nest-bar">
        <Link href="/" className="nest-logo">CampusNest</Link>
        <div className="nest-prog">
          {items.length ? `${Math.min(seen + 1, items.length)} of ${items.length} rooms, best matches first` : "Finding rooms..."}
          <i><b style={{ width: `${items.length ? (seen / items.length) * 100 : 0}%` }} /></i>
        </div>
        <div className="nest-right">
          <button className={`nest-btn${showFilters ? " active" : ""}`} onClick={() => setShowFilters(v => !v)} aria-pressed={showFilters}>Filters</button>
          <button className={`nest-btn${showMap ? " active" : ""}`} onClick={() => setShowMap(v => !v)} aria-pressed={showMap}>Map</button>
          <button className="nest-btn icon" onClick={toggleTheme} aria-label={dark ? "Switch to light mode" : "Switch to night mode"}>
            <Ic n={dark ? "sun" : "moon"} size={18} />
          </button>
          <Link href="/login" className="nest-btn">Log in</Link>
        </div>
      </header>

      <div className={`nest-main${showFilters ? "" : " no-left"}`}>
        <aside className="rail" hidden={!showFilters}>
          <h2>Your preferences</h2>
          {error && <p className="error">{error}</p>}
          <label className="field">
            <span>Your campus</span>
            <select value={campus} onChange={e => setCampus(e.target.value)}>
              <option value="">Choose a campus</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>

          <div className="field">
            <span>Who lives there</span>
            <div className="seg" role="radiogroup" aria-label="Who lives there">
              {[["all", "All homes"], ["friendly", "Women-friendly"], ["only", "Women only"]].map(([k, l]) => (
                <button key={k} type="button" role="radio" aria-checked={women === k} className={women === k ? "on" : ""} onClick={() => setWomen(k)}>{l}</button>
              ))}
            </div>
            <small className="seg-note">
              {women === "only" ? "Only homes with female tenants" : women === "friendly" ? "Female only or female preferred, ranked by safety" : "Every home, including male preferred"}
            </small>
          </div>

          <label className="switch">
            <input type="checkbox" checked={transport} onChange={e => setTransport(e.target.checked)} />
            <span className="track" />
            <span className="txt">Close to public transport<small>A short walk to a train or light rail stop</small></span>
          </label>
          <label className="switch">
            <input type="checkbox" checked={policeNear} onChange={e => setPoliceNear(e.target.checked)} />
            <span className="track" />
            <span className="txt">Close to a police station<small>Within 15 min walk</small></span>
          </label>
          <label className="field">
            <span>Max rent: {maxRent >= 400 ? "any" : `$${maxRent}/week`}</span>
            <input type="range" min="150" max="400" step="10" value={maxRent} onChange={e => setMaxRent(Number(e.target.value))} />
          </label>
          <button className="reset" onClick={reset}>Clear filters</button>
          <SafetyHelp />
        </aside>

        <main className="nest-stage">
          <div className="nest-deck">
            {deck[1] && <Card key={deck[1].id} l={deck[1]} campusName={campusName} behind />}
            {current ? (
              <Card key={current.id} l={current} campusName={campusName} leaving={leaving} onDecide={decide} />
            ) : (
              <div className="nest-empty">
                <h2>{items.length === 0 ? "No rooms match" : "You've seen them all"}</h2>
                <p>{items.length === 0 ? "Try loosening a filter." : `You saved ${saved.length}. Compare them in your shortlist.`}</p>
                <div className="row">
                  {passed.length > 0 && <button onClick={() => { setPassed([]); setHistory([]); }}>See passed rooms again</button>}
                  <button onClick={reset}>Start over</button>
                </div>
              </div>
            )}
          </div>

          <div className="nest-btns">
            <button className="nest-act sm undo" onClick={undo} disabled={!history.length} aria-label="Undo last swipe"><Ic n="undo" size={20} /></button>
            <button className="nest-act pass" onClick={() => decide("pass")} disabled={!current} aria-label="Pass"><Ic n="x" size={28} /></button>
            <button className="nest-act star sm" onClick={() => decide("star")} disabled={!current} aria-label="Top pick"><Ic n="star" size={22} /></button>
            <button className="nest-act save" onClick={() => decide("save")} disabled={!current} aria-label="Save"><Ic n="heart" size={30} /></button>
          </div>
          <p className="nest-keys"><kbd>←</kbd> pass <kbd>→</kbd> save <kbd>↑</kbd> top pick <kbd>Z</kbd> undo <kbd>F</kbd> hide panels</p>
        </main>

        <aside className="rail">
          {showMap && <GeoPicker campuses={campuses} campus={campus} onPick={setCampus} rooms={items} current={current} saved={saved} />}
          <h2>Shortlist ({saved.length})</h2>
          {saved.length === 0 && <p className="hint">Rooms you save show up here. Top picks go first.</p>}
          <ul className="nest-list">
            {shortlist.map(l => (
              <li key={l.id} className={l.star ? "top" : ""}>
                <div>
                  <p className="v">{l.star ? "★ " : ""}{l.suburb}, ${l.rent}/wk</p>
                  <p className="k">{l.title}</p>
                  <p className="k">{l.walk_min} min to {l.station}</p>
                </div>
                <button onClick={() => setSaved(saved.filter(s => s.id !== l.id))}>Remove</button>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </div>
  );
}