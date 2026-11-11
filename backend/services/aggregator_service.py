import asyncio
from services.aqi_service import get_waqi_data
from services.weather_service import get_weather_data
from services.traffic_service import get_traffic_data

async def get_combined_environmental_data(lat: float, lon: float):
    # Fetch all three APIs CONCURRENTLY for maximum performance!
    aqi_task = get_waqi_data(lat, lon)
    weather_task = get_weather_data(lat, lon)
    traffic_task = get_traffic_data(lat, lon)

    aqi_data, weather_data, traffic_data = await asyncio.gather(aqi_task, weather_task, traffic_task, return_exceptions=True)

    # Data Cleaning: Handle failed API calls gracefully
    return {
        "location": {"lat": lat, "lon": lon},
        "aqi": aqi_data if not isinstance(aqi_data, Exception) else None,
        "weather": weather_data if not isinstance(weather_data, Exception) else None,
        "traffic": traffic_data if not isinstance(traffic_data, Exception) else None,
        "timestamp": asyncio.get_event_loop().time() # Replace with datetime.utcnow() in production
    }