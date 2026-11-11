from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import os
from dotenv import load_dotenv
from datetime import datetime

load_dotenv()

client = InfluxDBClient(url=os.getenv("INFLUXDB_URL"), token=os.getenv("INFLUXDB_TOKEN"), org=os.getenv("INFLUXDB_ORG"))
write_api = client.write_api(write_options=SYNCHRONOUS)

async def save_environmental_data(lat: float, lon: float, data: dict):
    try:
        # Create a Point for InfluxDB
        point = (
            Point("environmental_readings")
            .tag("location", f"{lat},{lon}")
            .field("aqi", data.get("aqi", {}).get("aqi", 0) if data.get("aqi") else 0)
            .field("temperature", data.get("weather", {}).get("temperature", 0) if data.get("weather") else 0)
            .field("humidity", data.get("weather", {}).get("humidity", 0) if data.get("weather") else 0)
            .field("traffic_index", data.get("traffic", {}).get("traffic_index", 0) if data.get("traffic") else 0)
            .time(datetime.utcnow())
        )
        write_api.write(bucket=os.getenv("INFLUXDB_BUCKET"), record=point)
    except Exception as e:
        print(f"Error saving to InfluxDB: {e}")


def test_connection():
    """Return whether the configured InfluxDB server reports healthy."""
    try:
        return client.health().status == "pass"
    except Exception as e:
        print(f"InfluxDB health check failed: {e}")
        return False
