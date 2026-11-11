# Milestone 1 Review (Weeks 1–2)

| Requirement | Status | Evidence / notes |
| --- | --- | --- |
| Browser auto-geolocation with high accuracy and standard fallback | Complete | Existing `useGeolocation` hook is retained. |
| Current AQI from WAQI | Complete | `/api/aqi/current` and combined endpoint. |
| Weather and traffic service integration | Complete | OpenWeatherMap and TomTom adapters with request timeouts. |
| Combined environmental endpoint | Complete | Returns available provider data and per-source quality status. |
| InfluxDB environmental persistence | Complete | `environmental_readings` measurement; cloud endpoint configured through environment. |
| Dashboard current AQI, pollutants, weather, and location | Complete | Responsive dashboard sections in `frontend/src/components/dashboard/`. |
| Nearby monitoring stations on map | Complete | WAQI map feed and station detail panel. |
| Distance-aware AQI selection and IDW fallback | Partial | Implemented early using WAQI station AQIs, progressive radius search, and a confidence label; needs regional and freshness validation during Weeks 3–4. |
| Loading, retry, provider failure, and geolocation denied states | Complete | Per-section UI states and global error boundary. |
| Manual location search / IP comparison | Pending by plan | Deferred to Weeks 5–6; intentionally excluded. |
| OpenAQ integration | Pending / not used | WAQI supplies current and nearby AQI station data; the proposed OpenAQ v2 endpoint is retired, and OpenAQ v3 latest values are pollutant concentrations rather than AQI. |
| Database verification report | Complete | `docs/db_verification_report.md`: PASS; 2 points found for the last 24 hours, with observed retention and fields. |
| End-to-end API plus database write verification | Complete | `docs/e2e_test_results.md`: PASS for health, combined response keys, and a new InfluxDB point. |
| Screenshots, demo, and commit evidence | Pending manual artifacts | See `submission/CHECKLIST.md`. |

## Technical issue log

| Issue | Current understanding / handling |
| --- | --- |
| Desktop browser location can be 50–60 km from the user's precise position | Browser geolocation may rely on Wi-Fi/IP-derived estimates; `enableHighAccuracy` requests best available accuracy but cannot require GPS hardware. This milestone shows the detected coordinates and keeps manual override deferred. |
| InfluxDB localhost-versus-cloud configuration | The application expects the configured `INFLUXDB_URL` and credentials from `backend/.env`. Confirm that URL points to the intended Cloud instance; `/health` reports the database health state. |

## Milestone 2 improvement requirements

- Add a background data collector to build historical training data.
- Evaluate a Google Maps upgrade for mapping and routing requirements.
- Add authentication and authorization before exposing user-specific data.
- Revisit manual address search and IP-location comparison in Weeks 5–6 as planned.

## Verification status

The reports record the verification results from 2026-11-11. Re-run the scripts before later submissions to refresh the evidence.
