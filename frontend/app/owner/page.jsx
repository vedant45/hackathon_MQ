"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ListingsView, SubleasersView, BillsView, ComplaintsView, ProfileView } from "./views";

const SUB_ITEMS = [
  ["onboarding", "Onboarding / Offboarding"],
  ["complaints", "Track complaints"],
  ["leases", "Lease documents"],
];

export default function Owner() {
  const [pw, setPw] = useState("");
  const [view, setView] = useState("listings");
  const [menu, setMenu] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem("owner_pw");
    if (saved) setPw(saved);
    else window.location.replace("/login");
  }, []);

  const logout = () => {
    sessionStorage.removeItem("owner_pw");
    window.location.replace("/login");
  };

  if (!pw) return null;

  const go = v => { setView(v); setMenu(false); };
  const inSub = view.startsWith("sub-");

  return (
    <div className="dash">
      <header className="dash-bar">
        <Link href="/" className="brand">CampusNest</Link>
        <span>Owner dashboard</span>
      </header>

      <nav className="tabs">
        <div className="wrap tabrow">
          <button className={view === "listings" ? "tab on" : "tab"} onClick={() => go("listings")}>Listings</button>

          <div className="dropdown">
            <button className={inSub ? "tab on" : "tab"} onClick={() => setMenu(!menu)} aria-expanded={menu}>Subleasers</button>
            {menu && (
              <div className="menu">
                {SUB_ITEMS.map(([k, l]) => <button key={k} onClick={() => go(`sub-${k}`)}>{l}</button>)}
              </div>
            )}
          </div>

          <button className={view === "bills" ? "tab on" : "tab"} onClick={() => go("bills")}>Bills and management</button>
          <button className={view === "complaints" ? "tab on" : "tab"} onClick={() => go("complaints")}>Complaints</button>
          <button className={view === "profile" ? "tab on" : "tab"} onClick={() => go("profile")}>User / Profile</button>
        </div>
      </nav>

      <div className="wrap owner">
        {view === "listings" && <ListingsView pw={pw} onExpired={logout} />}
        {inSub && <SubleasersView key={view} pw={pw} mode={view.slice(4)} />}
        {view === "bills" && <BillsView pw={pw} />}
        {view === "complaints" && <ComplaintsView pw={pw} />}
        {view === "profile" && <ProfileView onLogout={logout} />}
      </div>
    </div>
  );
}