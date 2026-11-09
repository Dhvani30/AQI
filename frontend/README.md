# Air Quality Intelligence Dashboard

The frontend for the **AI-Powered Environmental Intelligence System for Air Quality Prediction and Smart Mobility Recommendations**. The project is intended to combine location-aware air quality forecasts with weather, traffic, and travel plans, then present route-specific advisories for commuters and people with health sensitivities.

## Product direction

The planned experience is a responsive dashboard that helps users understand current and forecast air quality and make informed travel decisions. See the [AI-AQI Figma design](https://www.figma.com/design/df8xVDozbBzghTlK96aWGW/AI-AQI?node-id=2-6166) for the visual target. The supplied reference shows an environmental monitoring dashboard with:

- A compact top navigation bar and a left navigation panel.
- Summary cards for active stations, alerts, forecast accuracy, and city AQI.
- AQI readings by monitoring station and a breakdown by AQI category.
- A table comparing recent predictions with actual readings.

The project brief also calls for a location and travel planning flow:

```text
User location and travel plan
  -> AQI and weather data fusion
  -> AQI forecasting model
  -> Route advisory and alert engine
  -> Dashboard and notifications
```

The dashboard screenshot and flow diagram describe the intended outcome. They are not all implemented in the current frontend yet.

## Planned dashboard capabilities

- Current and forecast AQI with pollutant details such as PM2.5, PM10, NO2, O3, and CO.
- An interactive pollution map, monitoring stations, and time-based AQI trends.
- Location access with user consent and a travel plan input for origin, destination, and departure time.
- Predicted pollution exposure along a route, with lower-pollution alternatives where available.
- Personalized health advisories based on profile settings and alert thresholds.
- Push notifications and personal exposure history.

## Current implementation

The app is an early React and TypeScript scaffold built with Vite. The active entry point, `src/App.tsx`, requests `http://127.0.0.1:8000/health` and displays the returned API status. The dashboard cards, charts, map, travel planner, and notification controls described above are planned features and are not present yet.

The backend currently exposes a health endpoint and basic in-memory user registration and lookup. AQI data ingestion, prediction, route estimation, and push notifications still need to be implemented across the system.

## Technology

- React 19 and TypeScript
- Vite for local development and production builds
- FastAPI backend (in `../backend`)
- Planned integrations from the project brief include Leaflet, AQI and weather feeds, Google Maps services, InfluxDB, and Firebase Cloud Messaging. These are not yet frontend dependencies.

## Run locally

From this directory, install dependencies and start the Vite development server:

```bash
npm install
npm run dev
```

Start the backend separately from the repository root:

```powershell
uvicorn main:app --reload --app-dir backend
```

The frontend currently expects the backend at `http://127.0.0.1:8000`. Vite prints the local frontend URL when it starts.

## Other scripts

```bash
npm run build
npm run lint
npm run preview
```

## Project plan

The project brief groups implementation into four modules:

1. Location and real-time AQI data integration, including consent, weather and traffic context, health profiles, and time-series storage.
2. AQI forecasting, including 1-24 hour predictions, spatial estimates, route exposure, and model updates.
3. Route advisories, dashboard visualizations, and push notifications.
4. System integration, testing, responsive UX refinement, documentation, and final demonstration.

These items describe the planned scope; the repository is still at the initial application scaffold stage.
