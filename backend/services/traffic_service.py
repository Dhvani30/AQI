import os
import httpx
from dotenv import load_dotenv

load_dotenv()

async def get_traffic_data(lat: float, lon:float):
    key= os.getenv("TOMTOM_API_KEY")
    url = f"https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json?point={lat},{lon}&key={key}"

    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()

        if "flowSegmentData" in data:
            segment_data = data["flowSegmentData"]
            return {
                "current_speed": segment_data.get("currentSpeed"),
                "free_flow_speed": segment_data.get("freeFlowSpeed"),
                "confidence": segment_data.get("confidence"),
                "road_closed": segment_data.get("roadClosed"),
                "jam_factor": segment_data.get("jamFactor"),
                "speed_limit": segment_data.get("speedLimit")
            }
        return{"Current_speed": None, "free_flow_speed": None, "confidence": None, "road_closed": None, "jam_factor": None, "speed_limit": None}