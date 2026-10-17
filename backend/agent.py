import os, json
from anthropic import Anthropic
from db import search_rooms, get_room   # your existing functions

client = Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
MODEL = "claude-sonnet-5-5"

TOOLS = [
    {
        "name": "search_rooms",
        "description": "Search available rooms. Only returns real listings.",
        "input_schema": {
            "type": "object",
            "properties": {
                "campus": {"type": "string"},
                "max_rent": {"type": "integer", "description": "AUD per week"},
                "female_friendly": {"type": "boolean"},
                "near_transport": {"type": "boolean"},
            },
            "required": ["campus"],
        },
    },
    {
        "name": "get_room",
        "description": "Get full details for one room by id.",
        "input_schema": {
            "type": "object",
            "properties": {"room_id": {"type": "integer"}},
            "required": ["room_id"],
        },
    },
]

SYSTEM = (
    "You are CampusNest's housing assistant for university students in Sydney. "
    "Only state facts (rent, distance, features) that come from tool results. "
    "Never invent listings. Be concise and explain trade-offs."
)

def run_tool(name, args):
    if name == "search_rooms":
        return search_rooms(**args)
    if name == "get_room":
        return get_room(**args)
    return {"error": "unknown tool"}

def chat(messages):
    while True:
        resp = client.messages.create(
            model=MODEL, max_tokens=1000,
            system=SYSTEM, tools=TOOLS, messages=messages,
        )
        if resp.stop_reason != "tool_use":
            return "".join(b.text for b in resp.content if b.type == "text")

        messages.append({"role": "assistant", "content": resp.content})
        results = []
        for block in resp.content:
            if block.type == "tool_use":
                out = run_tool(block.name, block.input)
                results.append({
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(out, default=str),
                })
        messages.append({"role": "user", "content": results})