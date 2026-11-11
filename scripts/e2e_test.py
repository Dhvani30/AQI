import os
from datetime import datetime, timezone
from pathlib import Path

import httpx
from dotenv import load_dotenv
from influxdb_client import InfluxDBClient

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "docs" / "e2e_test_results.md"
LATITUDE = 19.07
LONGITUDE = 72.87
LOCATION_TAG = f"{LATITUDE},{LONGITUDE}"
REQUIRED_KEYS = {
    "location",
    "aqi",
    "weather",
    "traffic",
    "timestamp",
    "pollutants",
    "source_timestamp",
    "data_quality",
    "stations",
}
REQUIRED_SPATIAL_KEYS = {
    "method",
    "nearest_station_km",
    "confidence",
}
SPATIAL_METHODS = {"station_direct", "idw_interpolated", "nearest_station_far", "no_data"}
CONFIDENCE_LEVELS = {"high", "medium", "low", "none"}


def query_point_times(client, org, bucket_name):
    flux = (
        f'from(bucket: "{bucket_name}") '
        '|> range(start: -15m) '
        f'|> filter(fn: (r) => r["_measurement"] == "environmental_readings" and r["location"] == "{LOCATION_TAG}")'
    )
    return {
        record.get_time().isoformat()
        for table in client.query_api().query(flux, org=org)
        for record in table.records
    }


def main():
    load_dotenv(ROOT / "backend" / ".env")
    api_base = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    influx_url = os.getenv("INFLUXDB_URL")
    influx_token = os.getenv("INFLUXDB_TOKEN")
    influx_org = os.getenv("INFLUXDB_ORG")
    bucket_name = os.getenv("INFLUXDB_BUCKET", "aqi_data")
    checks = []
    client = None
    started = datetime.now(timezone.utc).isoformat()

    try:
        with httpx.Client(timeout=35.0) as api:
            health = api.get(f"{api_base}/health")
            checks.append(("GET /health returns 200", health.status_code == 200, f"HTTP {health.status_code}"))

            if not all((influx_url, influx_token, influx_org, bucket_name)):
                raise RuntimeError("InfluxDB environment variables are incomplete")

            client = InfluxDBClient(
                url=influx_url,
                token=influx_token,
                org=influx_org,
                timeout=10000,
            )
            previous_times = query_point_times(client, influx_org, bucket_name)

            response = api.get(
                f"{api_base}/api/environment/combined",
                params={"lat": LATITUDE, "lon": LONGITUDE},
            )
            body = response.json() if response.content else {}
            has_keys = REQUIRED_KEYS.issubset(body.keys()) if isinstance(body, dict) else False
            quality = body.get("data_quality", {}) if isinstance(body, dict) else {}
            has_spatial_quality = REQUIRED_SPATIAL_KEYS.issubset(quality.keys()) if isinstance(quality, dict) else False
            spatial_valid = (
                has_spatial_quality
                and quality.get("method") in SPATIAL_METHODS
                and quality.get("confidence") in CONFIDENCE_LEVELS
                and isinstance(quality.get("aqi"), dict)
                and quality["aqi"].get("method") == quality.get("method")
            )
            checks.append((
                "Combined environment endpoint returns spatial quality and required keys",
                response.status_code == 200 and has_keys and spatial_valid,
                f"HTTP {response.status_code}; missing keys: {', '.join(sorted(REQUIRED_KEYS - set(body))) if isinstance(body, dict) else 'response is not an object'}; missing spatial keys: {', '.join(sorted(REQUIRED_SPATIAL_KEYS - set(quality))) if isinstance(quality, dict) else 'data_quality is not an object'}; method: {quality.get('method') if isinstance(quality, dict) else 'unknown'}; confidence: {quality.get('confidence') if isinstance(quality, dict) else 'unknown'}",
            ))

            current_times = query_point_times(client, influx_org, bucket_name)
            new_times = current_times - previous_times
            checks.append((
                "Combined request writes a new InfluxDB point",
                bool(new_times),
                f"Found {len(new_times)} new point timestamp(s)",
            ))
    except Exception as exc:
        checks.append(("Workflow execution", False, f"{type(exc).__name__}: {exc}"))
    finally:
        if client is not None:
            client.close()

    passed = all(result for _, result, _ in checks)
    lines = [
        "# End-to-end test results",
        "",
        f"Run started: {started}",
        f"Backend: `{api_base}`",
        f"Test coordinate: `{LOCATION_TAG}`",
        "",
        "| Check | Result | Detail |",
        "| --- | --- | --- |",
    ]
    for name, result, detail in checks:
        safe_detail = detail.replace("|", "\\|").replace("\n", " ")
        lines.append(f"| {name} | {'PASS' if result else 'FAIL'} | {safe_detail} |")
    lines.extend(["", f"## Summary: {'PASS' if passed else 'FAIL'}", ""])
    REPORT.parent.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines), encoding="utf-8")

    for name, result, detail in checks:
        print(f"{'PASS' if result else 'FAIL'}: {name} - {detail}")
    print(f"{'PASS' if passed else 'FAIL'}: End-to-end workflow")
    print(f"Report: {REPORT.relative_to(ROOT)}")
    return 0 if passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
