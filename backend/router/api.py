import math

import httpx
from fastapi import APIRouter, HTTPException, Query

from services.aqi_service import (
    get_waqi_spatial_data,
    get_waqi_stations,
)

router = APIRouter(prefix="/api/aqi", tags=["aqi"])

@router.get("/current")
async def get_current_aqi(lat: float = Query(...), lon: float = Query(...)):
    _validate_coordinates(lat, lon)
    try:
        spatial_data = await get_waqi_spatial_data(lat, lon)
    except (httpx.HTTPError, RuntimeError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="WAQI air-quality data is unavailable") from exc

    waqi_data = spatial_data.get("aqi") or {}
    return {
        "aqi": waqi_data.get("aqi"),
        "dominentpol": waqi_data.get("dominentpol"),
        "city": (waqi_data.get("city") or {}).get("name"),
        "pollutants": spatial_data["pollutants"],
        "source_timestamp": spatial_data["source_timestamp"],
        "data_quality": spatial_data["spatial_quality"],
    }


@router.get("/stations")
async def get_stations(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(25, gt=0, le=100),
):
    _validate_coordinates(lat, lon)
    try:
        stations = await get_waqi_stations(lat, lon, radius_km)
    except (httpx.HTTPError, RuntimeError, ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=502, detail="WAQI monitoring stations are unavailable") from exc
    return {"stations": stations}


def _validate_coordinates(lat: float, lon: float):
    if not math.isfinite(lat) or not -90 <= lat <= 90:
        raise HTTPException(status_code=400, detail="lat must be between -90 and 90")
    if not math.isfinite(lon) or not -180 <= lon <= 180:
        raise HTTPException(status_code=400, detail="lon must be between -180 and 180")
