import asyncio
from datetime import datetime, timezone

from services.aqi_service import (
    extract_pollutants,
    get_waqi_spatial_data,
)
from services.traffic_service import get_traffic_data
from services.weather_service import get_weather_data


def _source_status(value, label: str):
    if isinstance(value, Exception) or value is None:
        return {"status": "unavailable", "message": f"{label} data could not be loaded."}
    return {"status": "ok", "message": None}


async def get_combined_environmental_data(lat: float, lon: float):
    aqi_result, weather_result, traffic_result = await asyncio.gather(
        get_waqi_spatial_data(lat, lon),
        get_weather_data(lat, lon),
        get_traffic_data(lat, lon),
        return_exceptions=True,
    )

    spatial_data = aqi_result if not isinstance(aqi_result, Exception) else None
    aqi_data = spatial_data.get("aqi") if spatial_data else None
    weather_data = weather_result if not isinstance(weather_result, Exception) else None
    traffic_data = traffic_result if not isinstance(traffic_result, Exception) else None
    spatial_quality = (spatial_data or {}).get("spatial_quality") or {
        "method": "no_data",
        "nearest_station_km": None,
        "confidence": "none",
        "stations_used": 0,
        "search_radius_km": 100,
    }
    aqi_quality = _source_status(aqi_result, "Air quality")
    aqi_quality.update(spatial_quality)

    return {
        "location": {"lat": lat, "lon": lon},
        "aqi": aqi_data,
        "weather": weather_data,
        "traffic": traffic_data,
        "timestamp": asyncio.get_running_loop().time(),
        "pollutants": (spatial_data or {}).get("pollutants", extract_pollutants({})),
        "source_timestamp": (spatial_data or {}).get("source_timestamp"),
        "stations": (spatial_data or {}).get("stations", []),
        "data_quality": {
            "aqi": aqi_quality,
            "method": spatial_quality["method"],
            "nearest_station_km": spatial_quality["nearest_station_km"],
            "confidence": spatial_quality["confidence"],
            "weather": _source_status(weather_result, "Weather"),
            "traffic": _source_status(traffic_result, "Traffic"),
        },
        "request_timestamp": datetime.now(timezone.utc).isoformat(),
    }
