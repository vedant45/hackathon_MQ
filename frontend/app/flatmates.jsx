"use client";
import { useCallback, useEffect, useState } from "react";

const API = process.env.NEXT_PUBLIC_API;
const SLEEP = { early: "Early bird", night: "Night owl" };
const TIDY = ["Relaxed", "Tidy", "Very neat"];
const GUESTS = ["Rarely has guests", "Some guests", "Very social"];
const COVERS = ["#6d4fd0,#2a1a6e", "#0e7c7b,#14354a", "#8b5fd6,#c2527f", "#2f5fb3,#1b1650"];

// Fictional sample profiles. likes = she has already liked you, so you can see a match in the demo.
const PEOPLE = [
  { id: 1, name: "Mia", year: 2, course: "Nursing", campus: "macquarie", budget: 260, sleep: "early", tidy: 2, guests: 0, bio: "Quiet, cooks on Sundays, in the library by 8.", likes: true },
  { id: 2, name: "Priya", year: 1, course: "Computer Science", campus: "unsw", budget: 290, sleep: "night", tidy: 1, guests: 1, bio: "International student from Pune. Love board games and cheap eats.", likes: true },
  { id: 3, name: "Chloe", year: 3, course: "Law", campus: "usyd", budget: 330, sleep: "early", tidy: 2, guests: 1, bio: "Early runs, tidy kitchen, tea over drama.", likes: false },
  { id: 4, name: "Aisha", year: 1, course: "Biomedicine", campus: "uts", budget: 280, sleep: "night", tidy: 1, guests: 0, bio: "Night owl who studies in headphones. Very respectful of quiet.", likes: true },
  { id: 5, name: "Hannah", year: 2, course: "Education", campus: "macquarie", budget: 240, sleep: "early", tidy: 1, guests: 2, bio: "Friends over on weekends, always cleans up after.", likes: false },
  { id: 6, name: "Lena", year: 4, course: "Architecture", campus: "uts", budget: 340, sleep: "night", tidy: 0, guests: 1, bio: "Creative chaos, great playlists.", likes: false },
  { id: 7, name: "Grace", year: 2, course: "Commerce", campus: "unsw", budget: 300, sleep: "early", tidy: 2, guests: 0, bio: "Gym at 6, bed by 10. Plants are welcome.", likes: false },
  { id: 8, name: "Sofia", year: 1, course: "Psychology", campus: "usyd", budget: 270, sleep: "night", tidy: 1, guests: 1, bio: "Moved from Brazil. Cooking for the house is my love language.", likes: true },
  { id: 9, name: "Ella", year: 3, course: "Engineering", campus: "wsu", budget: 220, sleep: "early", tidy: 1, guests: 1, bio: "Commutes by train, keeps things low-key.", likes: false },
  { id: 10, name: "Nadia", year: 2, course: "Pharmacy", campus: "usyd", budget: 310, sleep: "early", tidy: 2, guests: 0, bio: "Study-first, weekends hiking.", likes: false },
  { id: 11, name: "Zoe", year: 1, course: "Media", campus: "macquarie", budget: 250, sleep: "night", tidy: 0, guests: 2, bio: "Film nights, loud laugh, big heart.", likes: false },
  { id: 12, name: "Ruby", year: 3, course: "Social Work", campus: "wsu", budget: 230, sleep: "early", tidy: 1, guests: 0, bio: "Calm, kind, and a very organised fridge.", likes: false },
];

const compat = (me, p) => {
  const parts = {
    Lifestyle: (me.sleep === p.sleep ? 50 : 10) + (2 - Math.abs(me.tidy - p.tidy)) * 25,
    Social: [100, 55, 15][Math.abs(me.guests - p.guests)],
    Budget: Math.max(0, Math.round(100 - Math.abs(me.budget - p.budget) * 1.2)),
    Campus: me.campus === p.campus ? 100 : 40,
  };
  const score = Math.round(parts.Lifestyle * 0.35 + parts.Social * 0.25 + parts.Budget * 0.25 + parts.Campus * 0.15);
  return { score, parts };
};

// Rooms close to BOTH campuses
async function roomsFor(a, b) {
  const get = c => fetch(`${API}/listings?campus=${c}`).then(r => r.json());
  const [x, y] = await Promise.all([get(a), get(b)]);
  const far = new Map(y.map(r => [r.id, r.campus_km]));
  return x
    .filter(r => r.household !== "male_preferred")
    .map(r => ({ ...r, both: r.campus_km + (far.get(r.id) ?? 99) }))
    .sort((m, n) => m.both - n.both)
    .slice(0, 3);
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
      <p className="hint">Meet in a public place first. Bring a friend. Never send money before you've met and seen the room.</p>
    </details>
  );
}

export default function Flatmates({ campuses }) {
  const [me, setMe] = useState(null);
  const [ready, setReady] = useState(false);
  const [form, setForm] = useState({ name: "", campus: "", budget: 260, sleep: "early", tidy: 1, guests: 1 });
  const [seen, setSeen] = useState([]);
  const [liked, setLiked] = useState([]);
  const [leaving, setLeaving] = useState(null);
  const [match, setMatch] = useState(null);
  const cn = id => campuses.find(c => c.id === id)?.name || id;

  useEffect(() => {
    try { setMe(JSON.parse(localStorage.getItem("nest_me"))); } catch {}
    setReady(true);
  }, []);

  const deck = me
    ? PEOPLE.filter(p => !seen.includes(p.id)).map(p => ({ ...p, ...compat(me, p) })).sort((a, b) => b.score - a.score)
    : [];
  const current = deck[0];

  const decide = useCallback(dir => {
    if (!current || leaving) return;
    const p = current;
    setLeaving(dir);
    setTimeout(async () => {
      setSeen(s => [...s, p.id]);
      setLeaving(null);
      if (dir === "like") {
        setLiked(l => [...l, p]);
        if (p.likes) setMatch({ p, rooms: await roomsFor(me.campus, p.campus).catch(() => []) });
      }
    }, 260);
  }, [current, leaving, me]);

  useEffect(() => {
    const onKey = e => {
      if (match || ["INPUT", "SELECT"].includes(e.target.tagName)) return;
      if (e.key === "ArrowRight") decide("like");
      if (e.key === "ArrowLeft") decide("pass");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [decide, match]);

  function save(e) {
    e.preventDefault();
    const profile = { ...form, tidy: Number(form.tidy), guests: Number(form.guests), budget: Number(form.budget) };
    try { localStorage.setItem("nest_me", JSON.stringify(profile)); } catch {}
    setMe(profile);
  }
  const edit = () => { setForm(me); setMe(null); setSeen([]); setLiked([]); };

  if (!ready) return null;

  /* ---------- Profile form ---------- */
  if (!me) {
    return (
      <div className="fm-onboard">
        <form className="fm-form" onSubmit={save}>
          <h2>Find a flatmate you'll actually get along with</h2>
          <p className="hint">A women-only community. Answer a few quick questions and we'll rank everyone by compatibility.</p>
          <label className="field"><span>First name</span><input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></label>
          <label className="field"><span>Your campus</span>
            <select value={form.campus} onChange={e => setForm({ ...form, campus: e.target.value })} required>
              <option value="">Choose a campus</option>
              {campuses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label className="field"><span>Budget: ${form.budget}/week</span>
            <input type="range" min="150" max="400" step="10" value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
          </label>
          <div className="fm-2">
            <label className="field"><span>Your rhythm</span>
              <select value={form.sleep} onChange={e => setForm({ ...form, sleep: e.target.value })}>
                <option value="early">Early bird</option><option value="night">Night owl</option>
              </select>
            </label>
            <label className="field"><span>Tidiness</span>
              <select value={form.tidy} onChange={e => setForm({ ...form, tidy: e.target.value })}>
                {TIDY.map((t, i) => <option key={t} value={i}>{t}</option>)}
              </select>
            </label>
          </div>
          <label className="field"><span>Guests at home</span>
            <select value={form.guests} onChange={e => setForm({ ...form, guests: e.target.value })}>
              {GUESTS.map((t, i) => <option key={t} value={i}>{t}</option>)}
            </select>
          </label>
          <button className="primary">Show my matches</button>
        </form>
      </div>
    );
  }

  /* ---------- People deck ---------- */
  const matches = liked.filter(p => p.likes);
  const style = leaving
    ? { transform: `translateX(${leaving === "like" ? 130 : -130}%) rotate(${leaving === "like" ? 16 : -16}deg)`, opacity: 0 }
    : undefined;

  return (
    <div className="nest-main">
      <aside className="rail">
        <h2>Hi {me.name}</h2>
        <p className="hint">{cn(me.campus)}, up to ${me.budget}/week</p>
        <div className="why">
          <span>{SLEEP[me.sleep]}</span><span>{TIDY[me.tidy]}</span><span>{GUESTS[me.guests]}</span>
        </div>
        <button className="reset" onClick={edit}>Edit my profile</button>
        <p className="hint">Compatibility is lifestyle 35%, social 25%, budget 25% and campus 15%. First names only. Chat opens only after you both say yes.</p>
        <SafetyHelp />
      </aside>

      <main className="nest-stage">
        <div className="nest-deck">
          {current ? (
            <article className="nest-card fm-card settle" style={style}>
              <div className="nest-cover" style={{ backgroundImage: `linear-gradient(155deg,${COVERS[current.id % COVERS.length]})` }}>
                <div className="avatar" aria-hidden="true">{current.name[0]}</div>
                <span className="tag f1">{current.score >= 80 ? "Great match" : "Possible match"}</span>
                <div className="fit" style={{ "--p": current.score }}><span>{current.score}<small>match</small></span></div>
                <div>
                  <p className="nest-sub">{current.name}</p>
                  <p className="nest-rent">Year {current.year}, {current.course}</p>
                </div>
              </div>
              <div className="nest-body">
                <h2>{current.bio}</h2>
                <div className="why">
                  <span>{SLEEP[current.sleep]}</span><span>{TIDY[current.tidy]}</span><span>{GUESTS[current.guests]}</span>
                </div>
                <div className="blocks">
                  <div className="blk"><p className="q">Studies at</p><p className="s">{cn(current.campus)}</p></div>
                  <div className="blk"><p className="q">Budget</p><p className="a">${current.budget}/wk</p></div>
                </div>
                <div className="bars">
                  <p className="q">Why you match</p>
                  {Object.entries(current.parts).map(([k, v]) => (
                    <div className="bar" key={k}><span>{k}</span><i><b style={{ width: `${v}%` }} /></i><em>{v}</em></div>
                  ))}
                </div>
              </div>
            </article>
          ) : (
            <div className="nest-empty">
              <h2>You've met everyone</h2>
              <p>Check back soon as more students join.</p>
              <div className="row"><button onClick={() => setSeen([])}>See everyone again</button></div>
            </div>
          )}
        </div>

        <div className="nest-btns">
          <button className="nest-act pass" onClick={() => decide("pass")} disabled={!current} aria-label="Pass">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
          <button className="nest-act save" onClick={() => decide("like")} disabled={!current} aria-label="Like">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.4-8-11a4.5 4.5 0 018-2.8A4.5 4.5 0 0120 10c0 5.6-8 11-8 11z" /></svg>
          </button>
        </div>
        <p className="nest-keys"><kbd>←</kbd> pass <kbd>→</kbd> like</p>
      </main>

      <aside className="rail">
        <h2>Matches ({matches.length})</h2>
        {matches.length === 0 && <p className="hint">Like someone who likes you back and she appears here.</p>}
        <ul className="nest-list">
          {matches.map(p => (
            <li key={p.id}><div><p className="v">{p.name}, {p.course}</p><p className="k">{cn(p.campus)}</p></div></li>
          ))}
        </ul>
        <p className="hint">These are fictional sample profiles for the demo.</p>
      </aside>

      {match && (
        <div className="fm-scrim" onClick={() => setMatch(null)}>
          <div className="fm-modal" onClick={e => e.stopPropagation()} role="dialog" aria-label="It's a match">
            <h2>It's a match!</h2>
            <p className="hint">You and {match.p.name} are {compat(me, match.p).score}% compatible. Rooms close to {cn(me.campus)} and {cn(match.p.campus)}:</p>
            <ul className="fm-rooms">
              {match.rooms.map(r => (
                <li key={r.id}>
                  <p className="v">{r.title}</p>
                  <p className="k">{r.suburb}, ${r.rent}/wk{r.safety !== undefined ? `, safety fit ${r.safety}` : ""}</p>
                </li>
              ))}
              {match.rooms.length === 0 && <li><p className="k">Couldn't load rooms. Is the backend running?</p></li>}
            </ul>
            <button className="primary" onClick={() => setMatch(null)}>Keep swiping</button>
          </div>
        </div>
      )}
    </div>
  );
}