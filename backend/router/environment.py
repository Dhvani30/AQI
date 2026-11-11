import math

from fastapi import APIRouter, HTTPException, Query
from services.aggregator_service import get_combined_environmental_data
from db_service import save_environmental_data

router = APIRouter(prefix="/api/environment", tags=["environment"])

@router.get("/combined")
async def combined_data(lat: float = Query(...), lon: float = Query(...)):
    if not math.isfinite(lat) or not -90 <= lat <= 90:
        raise HTTPException(status_code=400, detail="lat must be between -90 and 90")
    if not math.isfinite(lon) or not -180 <= lon <= 180:
        raise HTTPException(status_code=400, detail="lon must be between -180 and 180")

    data = await get_combined_environmental_data(lat, lon)
    await save_environmental_data(lat, lon, data)
    return data
