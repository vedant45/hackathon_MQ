import math
import os
from typing import Any, Dict, Optional

import base64
import hashlib
import hmac
import json
import time

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import db
from data import CAMPUSES, STATIONS, SUBURBS




app = FastAPI(title="CampusNest API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

db.init()

db.init_owner_tables()

OWNER_USER = "admin"
OWNER_PASSWORD = os.getenv("OWNER_PASSWORD", "admin")  # prototype only
HOUSEHOLDS = {"female_only", "female_preferred", "male_preferred", "any"}
WALK_M_PER_MIN = 80
DETOUR = 1.3  # straight-line distance -> realistic walking distance


def km(lat1, lng1, lat2, lng2):
    """Distance between two points in km (haversine formula)."""
    p = math.pi / 180
    a = (
        math.sin((lat2 - lat1) * p / 2) ** 2
        + math.cos(lat1 * p) * math.cos(lat2 * p) * math.sin((lng2 - lng1) * p / 2) ** 2
    )
    return 12742 * math.asin(math.sqrt(a))


def enrich(listing, campus):
    """Add nearest station, walk time, and distance to the chosen campus."""
    station, d = min(
        ((s, km(listing["lat"], listing["lng"], s["lat"], s["lng"])) for s in STATIONS),
        key=lambda x: x[1],
    )
    out = {
        **listing,
        "station": station["name"],
        "walk_min": max(1, round(d * 1000 * DETOUR / WALK_M_PER_MIN)),
    }
    if campus:
        out["campus_km"] = round(km(listing["lat"], listing["lng"], campus["lat"], campus["lng"]), 1)
    return out


def require_owner(password: str):
    if password != OWNER_PASSWORD:
        raise HTTPException(401, "Owner login required")


@app.get("/campuses")
def campuses():
    return [{"id": k, **v} for k, v in CAMPUSES.items()]


@app.get("/suburbs")
def suburbs():
    return sorted(SUBURBS.keys())


@app.get("/listings")
def listings(
    campus: Optional[str] = None,
    household: Optional[str] = None,
    walk_max: Optional[int] = None,
    max_rent: Optional[int] = None,
):
    c = CAMPUSES.get(campus) if campus else None
    if campus and not c:
        raise HTTPException(404, "Unknown campus")

    items = [enrich(l, c) for l in db.all_listings()]

    if household:
        wanted = set(household.split(","))
        items = [i for i in items if i["household"] in wanted]
    if walk_max is not None:
        items = [i for i in items if i["walk_min"] <= walk_max]
    if max_rent is not None:
        items = [i for i in items if i["rent"] <= max_rent]
    if c:
        items.sort(key=lambda i: i["campus_km"])

    return items


class Login(BaseModel):
    username: str
    password: str


@app.post("/owner/login")
def owner_login(body: Login):
    if body.username != OWNER_USER or body.password != OWNER_PASSWORD:
        raise HTTPException(401, "Wrong username or password")
    return {"ok": True}


class NewListing(BaseModel):
    title: str = Field(min_length=3, max_length=80)
    suburb: str
    rent: int = Field(gt=0, lt=5000)
    household: str


@app.post("/listings", status_code=201)
def add_listing(body: NewListing, x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    if body.household not in HOUSEHOLDS:
        raise HTTPException(422, "Invalid household type")
    if body.suburb not in SUBURBS:
        raise HTTPException(422, "Unknown suburb")
    lat, lng = SUBURBS[body.suburb]
    return db.add_listing(body.title, body.suburb, body.rent, body.household, lat, lng)


@app.delete("/listings/{listing_id}")
def delete_listing(listing_id: int, x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    if not db.delete_listing(listing_id):
        raise HTTPException(404, "Listing not found")
    return {"deleted": listing_id}




def check_table(table: str):
    if table not in db.TABLES:
        raise HTTPException(404, "Unknown table")


@app.get("/owner/{table}")
def owner_list(table: str, x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    check_table(table)
    return db.rows(table)


@app.post("/owner/{table}", status_code=201)
def owner_add(table: str, body: Dict[str, Any], x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    check_table(table)
    return db.insert(table, body)


@app.patch("/owner/{table}/{item_id}")
def owner_update(table: str, item_id: int, body: Dict[str, Any], x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    check_table(table)
    if not db.update(table, item_id, body):
        raise HTTPException(404, "Not found")
    return {"updated": item_id}


@app.delete("/owner/{table}/{item_id}")
def owner_delete(table: str, item_id: int, x_owner_password: str = Header(default="")):
    require_owner(x_owner_password)
    check_table(table)
    if not db.remove(table, item_id):
        raise HTTPException(404, "Not found")
    return {"deleted": item_id}




# ---------- Subleaser login (Google, or demo mode when no client ID is set) ----------
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
SESSION_SECRET = os.getenv("SESSION_SECRET", "dev-secret-change-me")  # set a real one outside the demo


def make_token(email: str, name: str) -> str:
    payload = base64.urlsafe_b64encode(json.dumps({"e": email, "n": name, "x": int(time.time()) + 86400}).encode()).decode()
    sig = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
    return f"{payload}.{sig}"


def read_token(token: str) -> dict:
    try:
        payload, sig = token.split(".")
        good = hmac.new(SESSION_SECRET.encode(), payload.encode(), hashlib.sha256).hexdigest()
        if not hmac.compare_digest(sig, good):
            raise ValueError
        data = json.loads(base64.urlsafe_b64decode(payload))
        if data["x"] < time.time():
            raise ValueError
        return data
    except Exception:
        raise HTTPException(401, "Please sign in again")


def find_sub(email: str):
    return next((r for r in db.rows("subleasers") if (r.get("email") or "").lower() == email.lower()), None)


class SubLogin(BaseModel):
    credential: Optional[str] = None
    demo_name: Optional[str] = None
    demo_email: Optional[str] = None


@app.get("/subleaser/config")
def subleaser_config():
    return {"google": bool(GOOGLE_CLIENT_ID)}


@app.post("/subleaser/login")
def subleaser_login(body: SubLogin):
    if body.credential:
        if not GOOGLE_CLIENT_ID:
            raise HTTPException(503, "Google sign-in isn't set up yet")
        from google.auth.transport import requests as grequests
        from google.oauth2 import id_token

        try:
            info = id_token.verify_oauth2_token(body.credential, grequests.Request(), GOOGLE_CLIENT_ID)
        except ValueError:
            raise HTTPException(401, "Google sign-in failed")
        email, name = info["email"], info.get("name", info["email"])
    elif body.demo_email and not GOOGLE_CLIENT_ID:
        email, name = body.demo_email.strip(), (body.demo_name or "Student").strip()
    else:
        raise HTTPException(401, "Sign in with Google")
    return {"token": make_token(email, name), "name": name}


@app.get("/subleaser/me")
def subleaser_me(x_session: str = Header(default="")):
    s = read_token(x_session)
    mine = find_sub(s["e"])
    out = {"name": s["n"], "email": s["e"], "profile": mine, "room": None, "bills": [], "complaints": []}
    if mine:
        out["room"] = next((l for l in db.all_listings() if l["id"] == mine["listing_id"]), None)
        out["bills"] = [b for b in db.rows("bills") if b["subleaser_id"] == mine["id"]]
        out["complaints"] = [c for c in db.rows("complaints") if c["subleaser_id"] == mine["id"]]
    return out


class SubComplaint(BaseModel):
    title: str = Field(min_length=3, max_length=100)
    details: str = Field(default="", max_length=500)


@app.post("/subleaser/complaints", status_code=201)
def subleaser_complaint(body: SubComplaint, x_session: str = Header(default="")):
    s = read_token(x_session)
    mine = find_sub(s["e"])
    if not mine:
        raise HTTPException(404, "Your owner hasn't added you yet")
    return db.insert("complaints", {"subleaser_id": mine["id"], "title": body.title, "details": body.details})