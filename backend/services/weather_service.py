import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")


async def get_weather_data(lat: float, lon: float):
    key = os.getenv("OPENWEATHERMAP_API_KEY")
    if not key:
        raise RuntimeError("OPENWEATHERMAP_API_KEY is not configured")

    url = "https://api.openweathermap.org/data/2.5/weather"
    async with httpx.AsyncClient(timeout=httpx.Timeout(10.0)) as client:
        response = await client.get(
            url,
            params={"lat": lat, "lon": lon, "appid": key, "units": "metric"},
        )
        response.raise_for_status()
        data = response.json()

    weather = (data.get("weather") or [{}])[0]
    main = data.get("main") or {}
    wind = data.get("wind") or {}
    return {
        "temperature": main.get("temp"),
        "humidity": main.get("humidity"),
        "pressure": main.get("pressure"),
        "weather": weather.get("description"),
        "wind_speed": wind.get("speed"),
        "wind_direction": wind.get("deg"),
    }
