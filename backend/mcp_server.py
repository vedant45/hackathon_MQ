# import os
# from typing import Any, Dict, Literal, Optional

# import httpx
# from mcp.server.fastmcp import FastMCP

# API = os.getenv("CAMPUSNEST_API", "http://localhost:8000")
# OWNER_PASSWORD = os.getenv("CAMPUSNEST_OWNER_PASSWORD", "")

# mcp = FastMCP("campusnest", host="127.0.0.1", port=8765)

# Household = Literal["female_only", "female_preferred", "male_preferred", "any"]
# Table = Literal["subleasers", "bills", "complaints"]


# def call(method: str, path: str, **kwargs):
#     r = httpx.request(method, f"{API}{path}", headers={"x-owner-password": OWNER_PASSWORD}, timeout=15, **kwargs)
#     if r.status_code >= 400:
#         raise RuntimeError(f"CampusNest API {r.status_code}: {r.text}")
#     return r.json()


# # ---------- Student search ----------
# @mcp.tool()
# def list_campuses() -> list:
#     """List the supported campuses (id and name). Use the id in search_rooms."""
#     return call("GET", "/campuses")


# @mcp.tool()
# def list_suburbs() -> list:
#     """List the suburbs a listing can be placed in."""
#     return call("GET", "/suburbs")


# @mcp.tool()
# def search_rooms(
#     campus: Optional[str] = None,
#     female_friendly: bool = False,
#     near_transport: bool = False,
#     max_rent: Optional[int] = None,
# ) -> list:
#     """Search student rooms. With a campus id (see list_campuses) each room includes campus_km and results are sorted closest first.
#     female_friendly keeps female_only and female_preferred homes. near_transport keeps rooms within a 10 minute walk of a station.
#     max_rent is dollars per week. Every room includes its nearest station and walk_min."""
#     params: Dict[str, Any] = {}
#     if campus:
#         params["campus"] = campus
#     if female_friendly:
#         params["household"] = "female_only,female_preferred"
#     if near_transport:
#         params["walk_max"] = 10
#     if max_rent:
#         params["max_rent"] = max_rent
#     return call("GET", "/listings", params=params)


# # ---------- Owner: listings ----------
# @mcp.tool()
# def add_listing(title: str, suburb: str, rent: int, household: Household) -> dict:
#     """Add a room listing (owner only). suburb must be one of list_suburbs. rent is dollars per week."""
#     return call("POST", "/listings", json={"title": title, "suburb": suburb, "rent": rent, "household": household})


# @mcp.tool()
# def delete_listing(listing_id: int) -> dict:
#     """Delete a listing by id (owner only). This cannot be undone, so confirm with the user first."""
#     return call("DELETE", f"/listings/{listing_id}")


# # ---------- Owner: subleasers, bills, complaints ----------
# @mcp.tool()
# def owner_list(table: Table) -> list:
#     """List all rows of subleasers, bills or complaints (owner only), newest first."""
#     return call("GET", f"/owner/{table}")


# @mcp.tool()
# def owner_add(table: Table, fields: Dict[str, Any]) -> dict:
#     """Add a row (owner only). Fields per table:
#     subleasers: name (required), email, phone, listing_id, status (onboarding|active|offboarded), move_in, move_out (YYYY-MM-DD), lease_url.
#     bills: subleaser_id, description (required), amount (required), due (YYYY-MM-DD), paid (0 or 1).
#     complaints: subleaser_id, title (required), details, status (open|in_progress|resolved)."""
#     return call("POST", f"/owner/{table}", json=fields)


# @mcp.tool()
# def owner_update(table: Table, item_id: int, fields: Dict[str, Any]) -> dict:
#     """Update fields on a row (owner only), for example {"status": "offboarded"} on a subleaser or {"paid": 1} on a bill."""
#     return call("PATCH", f"/owner/{table}/{item_id}", json=fields)


# @mcp.tool()
# def owner_delete(table: Table, item_id: int) -> dict:
#     """Delete a row (owner only). This cannot be undone, so confirm with the user first."""
#     return call("DELETE", f"/owner/{table}/{item_id}")


# if __name__ == "__main__":
#     # Default: stdio (the agent launches this file). Set MCP_TRANSPORT=http to serve at http://127.0.0.1:8765/mcp instead.
#     mcp.run(transport="streamable-http" if os.getenv("MCP_TRANSPORT") == "http" else "stdio")