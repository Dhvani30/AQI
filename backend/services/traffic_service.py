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
    return {
        "current_speed": segment.get("currentSpeed"),
        "free_flow_speed": segment.get("freeFlowSpeed"),
        "confidence": segment.get("confidence"),
        "road_closed": segment.get("roadClosed"),
        "jam_factor": segment.get("jamFactor"),
        "speed_limit": segment.get("speedLimit"),
    }
