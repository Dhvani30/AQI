import os
from pathlib import Path
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient

load_dotenv(dotenv_path=Path(__file__).with_name(".env"))

client = InfluxDBClient(
    url=os.getenv("INFLUXDB_URL"),
    token=os.getenv("INFLUXDB_TOKEN"),
    org=os.getenv("INFLUXDB_ORG")
)

def test_connection():
    try:
        health = client.health()
        return health.status == 'pass'
    except Exception as e:
        return False
