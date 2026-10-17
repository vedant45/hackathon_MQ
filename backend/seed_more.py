import random

import db
from data import SUBURBS

TARGET = 60  # 8 sample rooms + 52 new ones
db.init()
existing = db.all_listings()
if len(existing) >= TARGET:
    print(f"Already {len(existing)} rooms. Nothing to add.")
    raise SystemExit

rng = random.Random(7)
BASE = {
    "Newtown": 285, "Enmore": 270, "Erskineville": 290, "Glebe": 300, "Ultimo": 320,
    "Haymarket": 330, "Surry Hills": 340, "Redfern": 310, "Zetland": 315, "Kensington": 295,
    "Kingsford": 270, "Randwick": 300, "Macquarie Park": 265, "Marsfield": 245, "North Ryde": 250,
    "Epping": 245, "Chatswood": 300, "Parramatta": 225, "Harris Park": 205, "Westmead": 210,
}
ADJ = ["Sunny", "Bright", "Quiet", "Furnished", "Spacious", "Cosy", "Large", "Modern", "Airy"]
WHERE = ["in a share house", "in a terrace", "in a modern unit", "near the station",
         "with a balcony", "close to campus", "in a quiet street", "with ensuite"]
HOUSEHOLDS = ["female_only", "female_preferred", "male_preferred", "any"]

names = list(SUBURBS)
rng.shuffle(names)
added = 0
for i in range(TARGET - len(existing)):
    suburb = names[i % len(names)]
    lat, lng = SUBURBS[suburb]
    lat += rng.uniform(-0.004, 0.004)  # spread rooms around the suburb centre
    lng += rng.uniform(-0.004, 0.004)
    rent = max(160, min(390, BASE[suburb] + rng.choice([-30, -20, -10, 0, 10, 20, 30, 40])))
    household = rng.choices(HOUSEHOLDS, weights=[3, 3, 2, 5])[0]
    title = f"{rng.choice(ADJ)} room {rng.choice(WHERE)}"
    db.add_listing(title, suburb, rent, household, round(lat, 5), round(lng, 5))
    added += 1

print(f"Added {added} rooms. Total: {len(existing) + added}.")