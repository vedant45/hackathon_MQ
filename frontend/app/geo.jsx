"use client";
import { useEffect, useState } from "react";

const rad = d => (d * Math.PI) / 180;

/* ---------- Globe (orthographic projection, drawn in code) ---------- */
const AUS = [[142.5,-10.7],[143.5,-14],[145,-15],[146,-17.5],[147,-19],[149,-21],[150.7,-22.5],[153,-25.5],[153.5,-28.5],[153,-31],[152,-33],[151.2,-34],[150,-37],[147.5,-38],[146,-39],[144,-38.5],[141,-38],[139.5,-36],[138,-35],[137.5,-33],[135.5,-34.7],[134,-33],[131,-31.5],[126,-32.3],[124,-33.8],[121,-33.8],[118,-35],[115.5,-34],[115,-33],[115.7,-31.5],[114,-28],[113.5,-26],[114,-22],[116,-20.7],[119,-20],[122,-18],[123.5,-16.5],[126,-14],[129,-15],[131,-12],[134,-12],[136.8,-12],[136.5,-14],[140,-17.5],[141.5,-16],[141.5,-13]];

const GRID = [];
for (let lng = -180; lng < 180; lng += 30) {
  const m = [];
  for (let lat = -90; lat <= 90; lat += 5) m.push([lng, lat]);
  GRID.push(m);
}
for (let lat = -60; lat <= 60; lat += 30) {
  const m = [];
  for (let lng = -180; lng <= 180; lng += 5) m.push([lng, lat]);
  GRID.push(m);
}

function proj(lng, lat, lng0, lat0, R, c) {
  const dl = rad(lng - lng0), p = rad(lat), p0 = rad(lat0);
  const vis = Math.sin(p0) * Math.sin(p) + Math.cos(p0) * Math.cos(p) * Math.cos(dl) > 0;
  return {
    vis,
    x: c + R * Math.cos(p) * Math.sin(dl),
    y: c - R * (Math.cos(p0) * Math.sin(p) - Math.sin(p0) * Math.cos(p) * Math.cos(dl)),
  };
}

function toPath(points, lng0, lat0, R, c, close) {
  let d = "", pen = false;
  for (const [lng, lat] of points) {
    const q = proj(lng, lat, lng0, lat0, R, c);
    if (!q.vis) { pen = false; continue; }
    d += `${pen ? "L" : "M"}${q.x.toFixed(1)},${q.y.toFixed(1)}`;
    pen = true;
  }
  return close && d ? d + "Z" : d;
}

function Globe({ lat, lng }) {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setT(x => x + 0.025), 60);
    return () => clearInterval(id);
  }, []);

  const R = 54, c = 60, lng0 = 135 + 24 * Math.sin(t), lat0 = -22;
  const pin = proj(lng, lat, lng0, lat0, R, c);

  return (
    <svg className="globe" viewBox="0 0 120 120" role="img" aria-label="Globe centred on Australia">
      <defs>
        <radialGradient id="ocean" cx="35%" cy="30%">
          <stop offset="0" stopColor="#4b3fb0" />
          <stop offset="1" stopColor="#16123a" />
        </radialGradient>
      </defs>
      <circle cx={c} cy={c} r={R + 4} className="g-halo" />
      <circle cx={c} cy={c} r={R} fill="url(#ocean)" />
      {GRID.map((pts, i) => <path key={i} d={toPath(pts, lng0, lat0, R, c)} className="g-line" />)}
      <path d={toPath(AUS, lng0, lat0, R, c, true)} className="g-land" />
      {pin.vis && (
        <g transform={`translate(${pin.x.toFixed(1)} ${pin.y.toFixed(1)})`}>
          <circle r="3" className="g-pulse" />
          <circle r="2.6" className="g-pin" />
        </g>
      )}
      <circle cx={c} cy={c} r={R} fill="none" className="g-rim" />
    </svg>
  );
}

/* ---------- Sydney map ---------- */
const B = { w0: 150.96, w1: 151.26, s: -33.94, n: -33.75 };
const LABEL = {
  usyd: { dx: -8, dy: 14, a: "end" },
  uts: { dx: 8, dy: -8, a: "start" },
};
const short = id => (id === "macquarie" ? "Macquarie" : id.toUpperCase());

function SydneyMap({ campuses, campus, onPick, rooms, current, saved }) {
  const W = 280, H = 190;
  const k = Math.cos(rad(33.85));
  const s = Math.min((W - 28) / ((B.w1 - B.w0) * k), (H - 28) / (B.n - B.s));
  const ox = (W - (B.w1 - B.w0) * k * s) / 2;
  const oy = (H - (B.n - B.s) * s) / 2;
  const X = lng => ox + (lng - B.w0) * k * s;
  const Y = lat => oy + (B.n - lat) * s;
  const sel = campuses.find(c => c.id === campus);
  const savedIds = new Set(saved.map(r => r.id));
  const ringR = (5 / 111) * s; // 5 km

  return (
    <svg className="gmap" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Map of Sydney with campuses and rooms">
      {[1, 2, 3, 4].map(i => <line key={`v${i}`} x1={(W / 5) * i} y1="0" x2={(W / 5) * i} y2={H} className="m-grid" />)}
      {[1, 2, 3].map(i => <line key={`h${i}`} x1="0" y1={(H / 4) * i} x2={W} y2={(H / 4) * i} className="m-grid" />)}

      {sel && <circle cx={X(sel.lng)} cy={Y(sel.lat)} r={ringR} className="m-ring" />}

      {rooms.map(r => (
        <circle key={r.id} cx={X(r.lng)} cy={Y(r.lat)} r="2.6" className={savedIds.has(r.id) ? "m-room saved" : "m-room"} />
      ))}

      {current && (
        <g transform={`translate(${X(current.lng)} ${Y(current.lat)})`}>
          <circle r="5" className="m-cur-pulse" />
          <circle r="4.2" className="m-cur" />
        </g>
      )}

      {campuses.map(c => {
        const on = c.id === campus;
        const l = LABEL[c.id] || { dx: 0, dy: -9, a: "middle" };
        return (
          <g key={c.id} transform={`translate(${X(c.lng)} ${Y(c.lat)})`} className={on ? "m-pin sel" : "m-pin"}
            role="button" tabIndex={0} aria-pressed={on} aria-label={`Choose ${c.name}`}
            onClick={() => onPick(on ? "" : c.id)}
            onKeyDown={e => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), onPick(on ? "" : c.id))}>
            <title>{c.name}</title>
            <circle r="5.5" />
            <text x={l.dx} y={l.dy} textAnchor={l.a} className="m-lab">{short(c.id)}</text>
          </g>
        );
      })}
    </svg>
  );
}

export function GeoPicker({ campuses, campus, onPick, rooms, current, saved }) {
  const sel = campuses.find(c => c.id === campus);
  return (
    <section className="geo">
      <div className="geo-top">
        <Globe lat={sel?.lat ?? -33.87} lng={sel?.lng ?? 151.2} />
        <div>
          <p className="geo-k">Exploring</p>
          <p className="geo-v">Sydney, Australia</p>
          <p className="geo-s">{sel ? sel.name : "Tap a pin to choose your campus"}</p>
        </div>
      </div>
      <SydneyMap campuses={campuses} campus={campus} onPick={onPick} rooms={rooms} current={current} saved={saved} />
      <p className="geo-s">{rooms.length} rooms on the map{sel ? ", dashed ring is 5 km" : ""}</p>
    </section>
  );
}