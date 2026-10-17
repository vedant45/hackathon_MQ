# hackathon_MQ
Build plan: one phase at a time, testing each before the next

Phase 1 (now): the main prompt from before, with this added:

ROLES: three roles: Applicant (student searching), Subleaser (approved member of a household), and Lease Owner (manager of a household). A Lease Owner owns one or more Households, and each listing belongs to a Household. Use role-based access control on the server: users can only see and change data their role allows.

Phase 2: onboarding and access grants (after lunch)

When a Lease Owner approves an Applicant's inquiry, they become a Subleaser of that Household (onboarding).
Onboarding creates Access Grants for that Subleaser: Lease agreement (view document), Wifi details, Bill share, Keys, and Amenities (e.g. gym, parking, laundry). Each grant has a status (Active, Revoked), a start date and an optional end date.
Subleasers only see grants that are Active for them. Wifi passwords and other sensitive details are only visible to Active members and never sent to anyone else.
The Lease Owner has a Household dashboard listing members and their grants, and can revoke any single grant.
Record every grant and revoke in an Audit Log with who, what and when.
Keep everything else exactly as it is.

Phase 3: complaints, the “peace” part

Add Complaints. A Subleaser can raise a complaint for their Household with a category (Cleaning, Noise, Argument/Conflict, Room maintenance, Other), a description and a priority.
The Lease Owner sees all complaints for their Households, and can set status (Open, In progress, Resolved) and write a decision/action note. The Subleaser who raised it sees the updates.
Subleasers can choose to raise a complaint anonymously to other members, but the Lease Owner always sees who raised it.
Log complaint actions in the Audit Log.
Keep everything else exactly as it is.

Phase 4: bills and the 3-month check (Saturday evening)

Add Bills per Household: the Lease Owner adds a bill (type, amount, period) and it is split between Active subleasers (equal split by default). Each subleaser sees what they owe and can mark it paid; the Lease Owner confirms.
Add a Bills Report per subleaser showing totals owed, paid and outstanding.

Add a 3-month Access Review: every subleaser has a review due date 3 months after joining. The Lease Owner's dashboard shows reviews due. For each, the Lease Owner sees that subleaser's complaints and bill history, then chooses Approve (renew for 3 months) or Flag (with a note).
Keep everything else exactly as it is.

Phase 5: offboarding (Sunday morning)

Add Move-out (offboarding): the Lease Owner can end a subleaser's membership. This immediately revokes all their Access Grants, removes them from future bill splits, and shows a final bills summary. Record it in the Audit Log.
Keep everything else exactly as it is.
