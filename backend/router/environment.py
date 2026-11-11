from fastapi import APIRouter, Query
from services.aggregator_service import get_combined_environmental_data
from db_service import save_environmental_data

router = APIRouter(prefix="/api/environment", tags=["environment"])

@router.get("/combined")
async def combined_data(lat: float = Query(...), lon: float = Query(...)):
    data = await get_combined_environmental_data(lat, lon)
    
    # Save to InfluxDB in the background (non-blocking)
    await save_environmental_data(lat, lon, data)
    
    return data
