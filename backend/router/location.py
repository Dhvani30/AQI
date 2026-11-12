from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from router.auth import get_current_user
from db_service import save_location_history

router = APIRouter(prefix="/location", tags=["location"])


class LocationData(BaseModel):
    longitude: float = Field(ge=-180, le=180)
    latitude: float = Field(ge=-90, le=90)


@router.post("/update")
def update_location(
    data: LocationData,
    username: str | None = Query(default=None, min_length=3, max_length=30),
    authenticated_user: str = Depends(get_current_user),
):
    if username is not None and username != authenticated_user:
        raise HTTPException(status_code=403, detail="Location username does not match authenticated user")
    stored = save_location_history(data.latitude, data.longitude, authenticated_user)
    return {
        "message": "Location received",
        "latitude": data.latitude,
        "longitude": data.longitude,
        "stored": stored,
    }
