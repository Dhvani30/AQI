import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


async def get_traffic_data(lat: float, lon: float):
    key = os.getenv("TOMTOM_API_KEY")
    if not key:
        raise RuntimeError("TOMTOM_API_KEY is not configured")

    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        response = await client.get(
            url,
            params={"point": f"{lat},{lon}", "key": key},
        )
        response.raise_for_status()
        data = response.json()

    segment = data.get("flowSegmentData") or {}
    current_speed = segment.get("currentSpeed")
    free_flow_speed = segment.get("freeFlowSpeed")
    road_closed = segment.get("roadClosed")

    traffic_index = None
    try:
        if road_closed is True:
            traffic_index = 100.0
        elif current_speed is not None and free_flow_speed is not None and float(free_flow_speed) > 0:
            slowdown = 1 - (float(current_speed) / float(free_flow_speed))
            traffic_index = round(max(0.0, min(100.0, slowdown * 100)), 2)
    except (TypeError, ValueError):
        traffic_index = None

    return {
        "current_speed": current_speed,
        "free_flow_speed": free_flow_speed,
        "traffic_index": traffic_index,
        "confidence": segment.get("confidence"),
        "road_closed": road_closed,
        "jam_factor": segment.get("jamFactor"),
        "speed_limit": segment.get("speedLimit"),
    }
