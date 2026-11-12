from fastapi import APIRouter, Depends, HTTPException

from model.user import EvaluateRequest, HealthProfile
from router.auth import get_current_user
from services import advisory_service, profile_store

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me")
def get_current_profile(username: str = Depends(get_current_user)):
    user = profile_store.get_user(username)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    return user


@router.put("/me/health-profile")
def update_health_profile(
    health_profile: HealthProfile,
    username: str = Depends(get_current_user),
):
    profile_data = health_profile.model_dump()
    if not profile_store.update_health_profile(username, profile_data):
        raise HTTPException(status_code=404, detail="User not found")
    return {
        "message": "Health profile updated",
        "personal_threshold": profile_store.compute_threshold(profile_data),
    }


@router.post("/me/evaluate")
def evaluate_current_user_aqi(
    request: EvaluateRequest,
    username: str = Depends(get_current_user),
):
    user = profile_store.get_user(username)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired authentication token")
    return advisory_service.build_advisory(
        request.aqi,
        user["personal_threshold"],
        user["health_profile"],
    )
