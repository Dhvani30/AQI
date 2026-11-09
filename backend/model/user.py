from pydantic import BaseModel
from typing import Optional

class HealthProfile(BaseModel):
    is_asthematic: bool = False
    is_elderly : bool = False
    has_children : bool = False
    alert_threshold : int = 100

class User(BaseModel):
    username: str
    email: str
    health_profile: Optional[HealthProfile] = None
