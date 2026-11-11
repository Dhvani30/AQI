# InfluxDB verification report

Generated: 2026-11-11T17:49:57.055729+00:00
Bucket: `aqi_data`
Measurement: `environmental_readings`
Range: last 24 hours
Retention: expire: 2592000 seconds
Unique point count: 8
Tag keys: `location`
Fields: `aqi`, `humidity`, `temperature`, `traffic_index`

## Field units

| Field | Unit / meaning |
| --- | --- |
| `aqi` | US AQI index |
| `humidity` | percent |
| `temperature` | degrees Celsius |
| `traffic_index` | TomTom jam factor (unitless index) |

## Point timestamps and field values

The `location` tag value is redacted in this report; the tag key and each point's timestamp and field values are retained.

| Timestamp (UTC) | Tags | Field values |
| --- | --- | --- |
| 2026-11-11 14:27:32.083272+00:00 | location: `[redacted]` | `aqi`: 65.0, `humidity`: 45.0, `temperature`: 31.03, `traffic_index`: 0.0 |
| 2026-11-11 14:27:55.729413+00:00 | location: `[redacted]` | `aqi`: 65.0, `humidity`: 45.0, `temperature`: 31.03, `traffic_index`: 0.0 |
| 2026-11-11 17:11:39.030342+00:00 | location: `[redacted]` | `aqi`: 83.0, `humidity`: 39.0, `temperature`: 30.03, `traffic_index`: 0.0 |
| 2026-11-11 17:13:02.200307+00:00 | location: `[redacted]` | `aqi`: 99.0, `humidity`: 39.0, `temperature`: 29.95, `traffic_index`: 0.0 |
| 2026-11-11 17:13:27.094542+00:00 | location: `[redacted]` | `aqi`: 83.0, `humidity`: 39.0, `temperature`: 30.03, `traffic_index`: 0.0 |
| 2026-11-11 17:17:57.154075+00:00 | location: `[redacted]` | `aqi`: 99.0, `humidity`: 39.0, `temperature`: 29.95, `traffic_index`: 0.0 |
| 2026-11-11 17:49:09.474586+00:00 | location: `[redacted]` | `aqi`: 123.0, `humidity`: 37.0, `temperature`: 30.03 |
| 2026-11-11 17:49:48.592828+00:00 | location: `[redacted]` | `aqi`: 123.0, `humidity`: 37.0, `temperature`: 30.03 |
