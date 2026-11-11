import os
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from influxdb_client import InfluxDBClient

ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "docs" / "db_verification_report.md"
MEASUREMENT = "environmental_readings"
FIELD_UNITS = {
    "aqi": "US AQI index",
    "temperature": "degrees Celsius",
    "humidity": "percent",
    "traffic_index": "TomTom jam factor (unitless index)",
}


def markdown_value(value):
    return str(value).replace("|", "\\|").replace("\n", " ")


def main():
    load_dotenv(ROOT / "backend" / ".env")
    url = os.getenv("INFLUXDB_URL")
    token = os.getenv("INFLUXDB_TOKEN")
    org = os.getenv("INFLUXDB_ORG")
    bucket_name = os.getenv("INFLUXDB_BUCKET", "aqi_data")
    REPORT.parent.mkdir(parents=True, exist_ok=True)

    if not all((url, token, org, bucket_name)):
        message = "INFLUXDB_URL, INFLUXDB_TOKEN, INFLUXDB_ORG, and INFLUXDB_BUCKET must be set."
        REPORT.write_text(f"# InfluxDB verification\n\nFailed: {message}\n", encoding="utf-8")
        print(f"FAIL: {message}")
        return 1

    client = None
    try:
        client = InfluxDBClient(url=url, token=token, org=org, timeout=10000)
        if not client.ping():
            raise RuntimeError("InfluxDB ping failed")

        flux = (
            f'from(bucket: "{bucket_name}") '
            '|> range(start: -24h) '
            f'|> filter(fn: (r) => r["_measurement"] == "{MEASUREMENT}")'
        )
        query_result = client.query_api().query(flux, org=org)
        records = [record.values for table in query_result for record in table.records]

        tag_keys = sorted(
            key
            for key in {key for record in records for key in record}
            if not key.startswith("_") and key not in {"result", "table", "_start", "_stop", "_measurement"}
        )
        field_names = sorted({record.get("_field") for record in records if record.get("_field")})
        points = defaultdict(dict)
        for record in records:
            point_key = (str(record.get("_time")), str(record.get("location", "")))
            points[point_key][record.get("_field", "unknown")] = record.get("_value")

        bucket = client.buckets_api().find_bucket_by_name(bucket_name)
        retention_rules = getattr(bucket, "retention_rules", None) or []
        retention = ", ".join(
            f"{rule.type}: {rule.every_seconds} seconds" for rule in retention_rules
        ) or "No retention duration reported (bucket retains data indefinitely)."

        lines = [
            "# InfluxDB verification report",
            "",
            f"Generated: {datetime.now(timezone.utc).isoformat()}",
            f"Bucket: `{bucket_name}`",
            f"Measurement: `{MEASUREMENT}`",
            "Range: last 24 hours",
            f"Retention: {retention}",
            f"Unique point count: {len(points)}",
            f"Tag keys: {', '.join(f'`{key}`' for key in tag_keys) if tag_keys else 'None returned'}",
            f"Fields: {', '.join(f'`{field}`' for field in field_names) if field_names else 'None returned'}",
            "",
            "## Field units",
            "",
            "| Field | Unit / meaning |",
            "| --- | --- |",
        ]
        for field in field_names:
            lines.append(f"| `{field}` | {FIELD_UNITS.get(field, 'Not specified in application schema')} |")

        lines.extend([
            "",
            "## Point timestamps and field values",
            "",
            "The `location` tag value is redacted in this report; the tag key and each point's timestamp and field values are retained.",
            "",
            "| Timestamp (UTC) | Tags | Field values |",
            "| --- | --- | --- |",
        ])
        for (timestamp, location), values in sorted(points.items()):
            formatted_fields = ", ".join(
                f"`{name}`: {markdown_value(value)}" for name, value in sorted(values.items())
            )
            tags = f"location: `{ '[redacted]' if location else 'not present' }`"
            lines.append(f"| {timestamp} | {tags} | {formatted_fields} |")

        REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")
        timestamps = sorted({time for time, _ in points})
        formatted_fields = ", ".join(
            f"{field} ({FIELD_UNITS.get(field, 'unspecified')})" for field in field_names
        )
        print("PASS: InfluxDB connection succeeded")
        print(f"Record count: {len(points)}")
        print(f"Tags: {', '.join(tag_keys) if tag_keys else 'none'}")
        print(f"Fields and units: {formatted_fields or 'none'}")
        print(f"Timestamps: {', '.join(timestamps) if timestamps else 'none in the last 24 hours'}")
        print(f"Report: {REPORT.relative_to(ROOT)}")
        return 0
    except Exception as exc:
        REPORT.write_text(
            f"# InfluxDB verification report\n\nFailed: {type(exc).__name__}: {exc}\n",
            encoding="utf-8",
        )
        print(f"FAIL: InfluxDB verification failed: {type(exc).__name__}: {exc}")
        print(f"Report: {REPORT.relative_to(ROOT)}")
        return 1
    finally:
        if client is not None:
            client.close()


if __name__ == "__main__":
    raise SystemExit(main())
