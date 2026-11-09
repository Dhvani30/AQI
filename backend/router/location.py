from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter(prefix="/location", tags=["location"])


class LocationData(BaseModel):
    longitude: float
    latitude: float


@router.post("/update")
def update_location(data: LocationData):
    # Here you can handle the location data, e.g., store it in a database or perform some processing
    return {"message": "Location updated successfully", "longitude": data.longitude, "latitude": data.latitude}
