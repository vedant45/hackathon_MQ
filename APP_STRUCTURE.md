# CampusNest – App Structure

How CampusNest is organised: three roles, one login, and an IAM lifecycle that connects them.

> **Story:** Applicant → *onboarding (joiner)* → Subleaser → *offboarding (leaver)* → all access revoked.

---

## 1. Role flow (IAM lifecycle)

```mermaid
flowchart TD
    L["🔐 Login / Sign up<br/>username + password<br/>role-based access"]

    L --> A["🔍 APPLICANT<br/>Find a room"]
    L --> S["🏠 SUBLEASER<br/>Identity · lives in the house"]
    L --> O["🧑‍💼 LEASE OWNER<br/>Manager · runs the house"]

    A -- "sends inquiry" --> O
    O -- "approves → ONBOARDING<br/>creates access grants" --> S
    S -- "raises complaint" --> O
    O -- "3-month access review<br/>Approve or Flag" --> S
    O -- "move-out → OFFBOARDING<br/>revokes ALL access" --> X["🚪 Former subleaser<br/>no access"]

    O --> AL["📜 Audit Log<br/>every grant, revoke,<br/>complaint, payment"]
```

---

## 2. Screens by role

```mermaid
flowchart LR
    subgraph APPLICANT["🔍 Applicant – Find a room"]
        A1["Search<br/>campus · total weekly cost · room type<br/>household preference · distance<br/>walk to station 5/10/15 min"]
        A2["🎙️ Voice search"]
        A3["Listing page<br/>🛡️ Scam Shield"]
        A4["My inquiries<br/>message threads"]
        A5["Saved listings"]
        A1 --> A3 --> A4
        A2 --> A1
    end

    subgraph SUBLEASER["🏠 Subleaser – Live in the house"]
        S1["My Access<br/>lease · wifi · keys · amenities"]
        S2["My Bills<br/>owed · mark paid"]
        S3["Raise Complaint<br/>category · priority · anonymous"]
        S4["My Complaints<br/>status + decision"]
        S5["Profile"]
    end

    subgraph OWNER["🧑‍💼 Lease Owner – Run the house"]
        O1["Subleasers ▾<br/>Track · Onboarding/Offboarding<br/>Lease Documents · 3-Month Review"]
        O2["Listings & Inquiries"]
        O3["Bills & Management<br/>split · report per subleaser"]
        O4["Complaints<br/>Open → In progress → Resolved"]
        O5["Audit Log"]
        O6["Profile / Households"]
    end
```

---

## 3. Full structure (text version)

```
                        ┌──────────────────────┐
                        │  LOGIN / SIGN UP     │
                        │  username, password  │
                        │  choose role         │
                        └─────────┬────────────┘
          ┌───────────────────────┼────────────────────────┐
          ▼                       ▼                        ▼
 ┌─────────────────┐   ┌────────────────────┐   ┌─────────────────────────┐
 │  APPLICANT      │   │  SUBLEASER         │   │  LEASE OWNER (manager)  │
 └─────────────────┘   └────────────────────┘   └─────────────────────────┘

APPLICANT – Find a room
 ├─ Search
 │   ├─ Choose campus (MQ, USYD, UNSW, UTS, WSU)
 │   ├─ Filters: total weekly cost, room type,
 │   │   household (female-only / female preferred / male preferred / any),
 │   │   distance from campus, walk to station (5/10/15 min)
 │   ├─ Voice search
 │   └─ Listing card: true cost, km, station walk time, badges
 ├─ Listing page → Scam Shield warnings → Send inquiry
 ├─ My inquiries (message threads)
 └─ Saved listings
          │  approved by lease owner (ONBOARDING)
          ▼
SUBLEASER – Live in the house
 ├─ My Access: lease document, wifi, keys, amenities (only while Active)
 ├─ My Bills: what I owe, mark paid
 ├─ Raise Complaint: category, priority, optional anonymous
 ├─ My Complaints: status + owner's decision
 └─ Profile

LEASE OWNER – Run the house
 ├─ Subleasers ▾
 │   ├─ Track: members, review due, open complaints, outstanding bills
 │   ├─ Onboarding / Offboarding: approve applicant → grant access;
 │   │                            move-out → revoke ALL access
 │   ├─ Lease Documents
 │   └─ 3-Month Access Review: Approve (renew) or Flag
 ├─ Listings & Inquiries: post rooms, reply to applicants
 ├─ Bills & Management: add bill → auto split → report per subleaser
 ├─ Complaints: Open → In progress → Resolved + decision note
 ├─ Audit Log: every grant, revoke, complaint, payment
 └─ Profile / Households
```

---

## 4. IAM mapping

| IAM concept | In CampusNest |
|---|---|
| Identity | Subleaser account |
| Manager | Lease owner |
| Roles (RBAC) | Applicant, Subleaser, Lease Owner |
| Joiner | Onboarding: approved applicant receives access grants |
| Access grants | Lease agreement, wifi, bill share, keys, amenities |
| Access review | 3-month check: Approve or Flag |
| Leaver | Offboarding: move-out revokes all grants |
| Audit | Append-only log of every access and household action |

---

_Design: Vedant (lease owner dashboard) · Concept and prompts: Sadhvika · Built with Sym AI for Sym AI Open 2026._
