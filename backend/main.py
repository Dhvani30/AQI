from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from db_service import test_connection
from router import api, auth, environment, location, user

app = FastAPI(title="AQI prediction API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],)
app.include_router(environment.router)
app.include_router(api.router)
app.include_router(auth.router)
app.include_router(location.router)
app.include_router(user.router)


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for error in exc.errors():
        safe_error = dict(error)
        if request.url.path in {"/auth/login", "/auth/register"} or "password" in error.get("loc", ()):
            safe_error.pop("input", None)
        errors.append(safe_error)
    return JSONResponse(status_code=422, content=jsonable_encoder({"detail": errors}))

@app.get("/")
def read_root():
    return {"message": "Welcome to the AQI prediction API!"}
@app.get("/health")
def health_check():
    db_health = test_connection()
    return {"status": "healthy", "database_connected": db_health}
