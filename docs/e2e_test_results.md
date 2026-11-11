# End-to-end test results

Run started: 2026-11-11T17:49:45.593395+00:00
Backend: `http://127.0.0.1:8000`
Test coordinate: `19.07,72.87`

| Check | Result | Detail |
| --- | --- | --- |
| GET /health returns 200 | PASS | HTTP 200 |
| Combined environment endpoint returns spatial quality and required keys | PASS | HTTP 200; missing keys: ; missing spatial keys: ; method: idw_interpolated; confidence: high |
| Combined request writes a new InfluxDB point | PASS | Found 1 new point timestamp(s) |

## Summary: PASS
