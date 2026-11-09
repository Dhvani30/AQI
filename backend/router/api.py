from fastapi import APIRouter, Query
from services.aqi_service import get_waqi_data

router = APIRouter(prefix="/api/aqi", tags=["aqi"])

@router.get("/current")
async def get_current_aqi(lat: float = Query(...), lon: float = Query(...)):
    wasqi_data = await get_waqi_data(lat, lon)
    if wasqi_data:
        return {
            "aqi": wasqi_data["aqi"],
            "dominentpol": wasqi_data["dominentpol"],
            "city": wasqi_data["city"]["name"]
        }
    return {"error": "Failed to fetch AQI data from WAQI API"}