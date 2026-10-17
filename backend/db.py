import sqlite3

from data import LISTINGS

DB_FILE = "campusnest.db"


def conn():
    c = sqlite3.connect(DB_FILE)
    c.row_factory = sqlite3.Row
    return c


def init():
    """Create the table and load the sample listings the first time only."""
    with conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS listings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                suburb TEXT NOT NULL,
                rent INTEGER NOT NULL,
                household TEXT NOT NULL,
                lat REAL NOT NULL,
                lng REAL NOT NULL
            )"""
        )
        if c.execute("SELECT COUNT(*) FROM listings").fetchone()[0] == 0:
            c.executemany(
                "INSERT INTO listings (id, title, suburb, rent, household, lat, lng) "
                "VALUES (:id, :title, :suburb, :rent, :household, :lat, :lng)",
                LISTINGS,
            )


def all_listings():
    with conn() as c:
        return [dict(r) for r in c.execute("SELECT * FROM listings ORDER BY id")]


def add_listing(title, suburb, rent, household, lat, lng):
    with conn() as c:
        cur = c.execute(
            "INSERT INTO listings (title, suburb, rent, household, lat, lng) VALUES (?, ?, ?, ?, ?, ?)",
            (title, suburb, rent, household, lat, lng),
        )
        row = c.execute("SELECT * FROM listings WHERE id = ?", (cur.lastrowid,)).fetchone()
        return dict(row)


def delete_listing(listing_id):
    with conn() as c:
        return c.execute("DELETE FROM listings WHERE id = ?", (listing_id,)).rowcount > 0



TABLES = {
    "subleasers": {"name": "TEXT NOT NULL", "email": "TEXT", "phone": "TEXT", "listing_id": "INTEGER",
                   "status": "TEXT DEFAULT 'onboarding'", "move_in": "TEXT", "move_out": "TEXT", "lease_url": "TEXT"},
    "bills": {"subleaser_id": "INTEGER", "description": "TEXT NOT NULL", "amount": "REAL NOT NULL",
              "due": "TEXT", "paid": "INTEGER DEFAULT 0"},
    "complaints": {"subleaser_id": "INTEGER", "title": "TEXT NOT NULL", "details": "TEXT",
                   "status": "TEXT DEFAULT 'open'", "created": "TEXT DEFAULT CURRENT_DATE"},
}


def init_owner_tables():
    with conn() as c:
        for t, cols in TABLES.items():
            defs = ", ".join(f"{k} {v}" for k, v in cols.items())
            c.execute(f"CREATE TABLE IF NOT EXISTS {t} (id INTEGER PRIMARY KEY AUTOINCREMENT, {defs})")


def rows(t):
    with conn() as c:
        return [dict(r) for r in c.execute(f"SELECT * FROM {t} ORDER BY id DESC")]


def insert(t, data):
    cols = [k for k in data if k in TABLES[t]]
    marks = ",".join(["?"] * len(cols))
    with conn() as c:
        cur = c.execute(f"INSERT INTO {t} ({','.join(cols)}) VALUES ({marks})", [data[k] for k in cols])
        return dict(c.execute(f"SELECT * FROM {t} WHERE id = ?", (cur.lastrowid,)).fetchone())


def update(t, item_id, data):
    cols = [k for k in data if k in TABLES[t]]
    if not cols:
        return False
    sets = ",".join(f"{k} = ?" for k in cols)
    with conn() as c:
        return c.execute(f"UPDATE {t} SET {sets} WHERE id = ?", [data[k] for k in cols] + [item_id]).rowcount > 0


def remove(t, item_id):
    with conn() as c:
        return c.execute(f"DELETE FROM {t} WHERE id = ?", (item_id,)).rowcount > 0