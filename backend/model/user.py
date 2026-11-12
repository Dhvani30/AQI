from pydantic import BaseModel, Field


class HealthProfile(BaseModel):
    is_asthmatic: bool = False
    is_elderly: bool = False
    has_children: bool = False
    custom_threshold: int | None = Field(default=None, ge=0, le=500)


class AuthRegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=8, max_length=256)


class AuthLoginRequest(BaseModel):
    username: str = Field(min_length=3, max_length=30, pattern=r"^[A-Za-z0-9_.-]+$")
    password: str = Field(min_length=1, max_length=256)


class EvaluateRequest(BaseModel):
    aqi: float = Field(ge=0)
