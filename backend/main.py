from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from db_service import test_connection
from router import user

app = FastAPI(title="AQI prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)
app.include_router(user.router)
@app.get("/")
def read_root():
    return {"message": "Welcome to the AQI prediction API!"}
@app.get("/health")
def health_check():
    db_health = test_connection()
    return {"status": "healthy", "database_connected": db_health}
