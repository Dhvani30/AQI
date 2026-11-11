import math
import os
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

INFLUX_URL = os.getenv("INFLUXDB_URL")
INFLUX_TOKEN = os.getenv("INFLUXDB_TOKEN")
INFLUX_ORG = os.getenv("INFLUXDB_ORG")
INFLUX_BUCKET = os.getenv("INFLUXDB_BUCKET")

print("--- INFLUXDB CONNECTION ATTEMPT ---")
print(f"URL: {INFLUX_URL}")
print(f"ORG: {INFLUX_ORG}")
print(f"BUCKET: {INFLUX_BUCKET}")

client = None
write_api = None

try:
    if not all((INFLUX_URL, INFLUX_TOKEN, INFLUX_ORG)):
        raise ValueError("INFLUXDB_URL, INFLUXDB_TOKEN, and INFLUXDB_ORG must be set")

    client = InfluxDBClient(url=INFLUX_URL, token=INFLUX_TOKEN, org=INFLUX_ORG)
    write_api = client.write_api(write_options=SYNCHRONOUS)

    if client.ping():
        print("InfluxDB connection successful")
    else:
        print("InfluxDB ping failed")
except Exception as exc:
    print(f"InfluxDB initialization failed: {exc}")
    client = None
    write_api = None


def _as_float(value):
    if value is None:
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


async def save_environmental_data(lat: float, lon: float, data: dict):
    if write_api is None or not INFLUX_BUCKET:
        print("Skipping InfluxDB write: client or bucket is not configured")
        return

    try:
        aqi_data = data.get("aqi") or {}
        aqi_value = aqi_data.get("aqi", 0) if isinstance(aqi_data, dict) else aqi_data
        weather_data = data.get("weather") or {}
        traffic_data = data.get("traffic") or {}

        fields = {
            "aqi": _as_float(aqi_value),
            "temperature": _as_float(weather_data.get("temperature")),
            "humidity": _as_float(weather_data.get("humidity")),
            "traffic_index": _as_float(traffic_data.get("traffic_index", traffic_data.get("jam_factor"))),
        }
        fields = {name: value for name, value in fields.items() if value is not None}
        if not fields:
            print("Skipping InfluxDB write: no numeric environmental readings are available")
            return

        point = Point("environmental_readings").tag("location", f"{lat},{lon}")
        for name, value in fields.items():
            point = point.field(name, value)
        point = point.time(datetime.now(timezone.utc))

        write_api.write(bucket=INFLUX_BUCKET, org=INFLUX_ORG, record=point)
        print("Environmental reading saved to InfluxDB")
    except Exception as exc:
        print(f"Error saving environmental data to InfluxDB: {exc}")


def test_connection():
    if client is None:
        return False

    try:
        return client.ping()
    except Exception as exc:
        print(f"InfluxDB connectivity check failed: {exc}")
        return False
