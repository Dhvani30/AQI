import os
import secrets
import sqlite3
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
REQUIRED_SPATIAL_KEYS = {"method", "nearest_station_km", "confidence"}
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


def add_check(checks, name, response, expected_status):
    body = response.json() if response.content else {}
    passed = response.status_code == expected_status
    detail = f"HTTP {response.status_code}"
    if not passed and isinstance(body, dict):
        message = body.get("detail")
        if isinstance(message, str):
            detail = f"HTTP {response.status_code}: {message}"
    checks.append((name, passed, detail))
    return body


def main():
    load_dotenv(ROOT / "backend" / ".env")
    api_base = os.getenv("API_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
    influx_url = os.getenv("INFLUXDB_URL")
    influx_token = os.getenv("INFLUXDB_TOKEN")
    influx_org = os.getenv("INFLUXDB_ORG")
    bucket_name = os.getenv("INFLUXDB_BUCKET", "aqi_data")
    checks = []
    client = None
    username = None
    started = datetime.now(timezone.utc).isoformat()

    try:
        with httpx.Client(timeout=35.0) as api:
            health = api.get(f"{api_base}/health")
            add_check(checks, "GET /health returns 200", health, 200)

            user_suffix = secrets.token_hex(5)
            username = f"e2e_{user_suffix}"
            password = secrets.token_urlsafe(18)
            email = f"{username}@example.test"

            registration = api.post(
                f"{api_base}/auth/register",
                json={"username": username, "email": email, "password": password},
            )
            registered = add_check(checks, "POST /auth/register creates a user", registration, 201)
            token = registered.get("token") if isinstance(registered, dict) else None

            if registration.status_code == 201 and isinstance(token, str):
                login = api.post(
                    f"{api_base}/auth/login",
                    json={"username": username, "password": password},
                )
                logged_in = add_check(checks, "POST /auth/login returns a token", login, 200)
                login_token = logged_in.get("token") if isinstance(logged_in, dict) else None
                if isinstance(login_token, str):
                    token = login_token
            else:
                checks.append(("POST /auth/login returns a token", False, "Registration did not return a token"))

            if isinstance(token, str):
                headers = {"Authorization": f"Bearer {token}"}
                profile_response = api.get(f"{api_base}/users/me", headers=headers)
                profile = add_check(checks, "GET /users/me returns the authenticated profile", profile_response, 200)
                profile_valid = (
                    isinstance(profile, dict)
                    and profile.get("username") == username
                    and profile.get("personal_threshold") == 100
                    and "password_hash" not in profile
                )
                checks.append(("Profile omits password data and starts with threshold 100", profile_valid, "Profile fields checked"))

                update = api.put(
                    f"{api_base}/users/me/health-profile",
                    headers=headers,
                    json={
                        "is_asthmatic": True,
                        "is_elderly": False,
                        "has_children": False,
                        "custom_threshold": None,
                    },
                )
                updated = add_check(checks, "PUT /users/me/health-profile saves asthma sensitivity", update, 200)
                checks.append((
                    "Asthma sensitivity sets personal threshold to 50",
                    isinstance(updated, dict) and updated.get("personal_threshold") == 50,
                    f"Threshold: {updated.get('personal_threshold') if isinstance(updated, dict) else 'unavailable'}",
                ))

                advisory_response = api.post(
                    f"{api_base}/users/me/evaluate",
                    headers=headers,
                    json={"aqi": 65},
                )
                advisory = add_check(checks, "POST /users/me/evaluate returns an advisory", advisory_response, 200)
                checks.append((
                    "AQI 65 raises an alert for asthma profile",
                    isinstance(advisory, dict)
                    and advisory.get("alert") is True
                    and advisory.get("personal_threshold") == 50
                    and any("asthma" in text.lower() for text in advisory.get("advisories", [])),
                    "AQI, threshold, alert, and asthma advice checked",
                ))
            else:
                for name in (
                    "GET /users/me returns the authenticated profile",
                    "Profile omits password data and starts with threshold 100",
                    "PUT /users/me/health-profile saves asthma sensitivity",
                    "Asthma sensitivity sets personal threshold to 50",
                    "POST /users/me/evaluate returns an advisory",
                    "AQI 65 raises an alert for asthma profile",
                ):
                    checks.append((name, False, "Login did not return a token"))

            missing_token = api.get(f"{api_base}/users/me")
            add_check(checks, "GET /users/me without a token returns 401", missing_token, 401)

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
                f"HTTP {response.status_code}; required keys present: {has_keys}; spatial quality valid: {spatial_valid}",
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
        if username is not None:
            try:
                with sqlite3.connect(ROOT / "backend" / "users.db") as connection:
                    deleted = connection.execute(
                        "DELETE FROM users WHERE username = ?", (username,)
                    ).rowcount
                checks.append(("Temporary E2E account is removed", deleted == 1, "Temporary account cleanup checked"))
            except Exception as exc:
                checks.append(("Temporary E2E account is removed", False, f"{type(exc).__name__}: {exc}"))

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
