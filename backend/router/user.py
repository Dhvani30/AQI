from fastapi import APIRouter, HTTPException
from model.user import User

router = APIRouter(prefix="/users", tags=["users"])
fake_users_db = {}

@router.post("/register")
def register_user(user: User):
    fake_users_db[user.username] = user
    return {"message": "User registered successfully", "user": user}

@router.get("/{username}")
def get_user(username: str):
    user = fake_users_db.get(username)
    if user is not None:
        return user
    raise HTTPException(status_code=404, detail="User not found")
