from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from model.user import AuthLoginRequest, AuthRegisterRequest
from services import auth_service, profile_store

router = APIRouter(prefix="/auth", tags=["auth"])
bearer_scheme = HTTPBearer(auto_error=False)


@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: AuthRegisterRequest):
    password_hash = auth_service.hash_password(request.password)
    if not profile_store.create_user(request.username, request.email, password_hash):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username is already taken")

    return {"token": auth_service.create_token(request.username), "username": request.username}


@router.post("/login")
def login(request: AuthLoginRequest):
    stored_hash = profile_store.get_password_hash(request.username)
    if stored_hash is None or not auth_service.verify_password(request.password, stored_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return {"token": auth_service.create_token(request.username), "username": request.username}


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> str:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    username = auth_service.decode_token(credentials.credentials)
    if username is None or profile_store.get_user(username) is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return username
