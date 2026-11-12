# End-to-end test results

Run started: 2026-11-12T08:24:14.001726+00:00
Backend: `http://127.0.0.1:8001`
Test coordinate: `19.07,72.87`

| Check | Result | Detail |
| --- | --- | --- |
| GET /health returns 200 | PASS | HTTP 200 |
| POST /auth/register creates a user | PASS | HTTP 201 |
| POST /auth/login returns a token | PASS | HTTP 200 |
| GET /users/me returns the authenticated profile | PASS | HTTP 200 |
| Profile omits password data and starts with threshold 100 | PASS | Profile fields checked |
| PUT /users/me/health-profile saves asthma sensitivity | PASS | HTTP 200 |
| Asthma sensitivity sets personal threshold to 50 | PASS | Threshold: 50 |
| POST /users/me/evaluate returns an advisory | PASS | HTTP 200 |
| AQI 65 raises an alert for asthma profile | PASS | AQI, threshold, alert, and asthma advice checked |
| GET /users/me without a token returns 401 | PASS | HTTP 401 |
| Combined environment endpoint returns spatial quality and required keys | PASS | HTTP 200; required keys present: True; spatial quality valid: True |
| Combined request writes a new InfluxDB point | PASS | Found 1 new point timestamp(s) |
| Temporary E2E account is removed | PASS | Temporary account cleanup checked |

## Summary: PASS
