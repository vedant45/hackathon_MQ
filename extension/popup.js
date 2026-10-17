const API = "http://localhost:8000";
const select = document.getElementById("campus");
const list = document.getElementById("list");
const msg = document.getElementById("msg");

fetch(`${API}/campuses`)
  .then(r => r.json())
  .then(cs => cs.forEach(c => select.add(new Option(c.name, c.id))))
  .catch(() => (msg.textContent = "Can't reach the backend. Is it running?"));

select.onchange = async () => {
  list.replaceChildren();
  if (!select.value) return (msg.textContent = "Pick a campus to see the closest rooms.");
  const rooms = await (await fetch(`${API}/listings?campus=${select.value}`)).json();
  msg.textContent = `${rooms.length} rooms, closest first`;
  rooms.slice(0, 5).forEach(l => {
    const d = document.createElement("div");
    d.className = "room";
    const rent = document.createElement("span");
    rent.className = "rent";
    rent.textContent = `$${l.rent}/wk`;
    const title = document.createElement("b");
    title.textContent = l.title;
    const meta = document.createElement("span");
    meta.textContent = `${l.campus_km} km to campus, ${l.walk_min} min to ${l.station}`;
    d.append(rent, title, meta);
    list.append(d);
  });
};