# AQI Dashboard

A React and FastAPI application that uses the browser's device location to fetch and display a current air quality reading from WAQI.

## Current features

- User-initiated browser geolocation with a high-accuracy request and standard-accuracy fallback.
- Location coordinates, reported accuracy, and fix time.
- Current AQI, dominant pollutant, and reporting station from WAQI.
- FastAPI health endpoint with an InfluxDB connection check.

Forecasts, route recommendations, maps, and notifications are planned work and are not part of the current flow.

## Requirements

- Python and pip
- Node.js and npm
- A WAQI API token
- InfluxDB credentials for the backend health check

## Setup

Create `backend/.env`:

```dotenv
WAQI_API_TOKEN=your_waqi_token
INFLUXDB_URL=your_influxdb_url
INFLUXDB_TOKEN=your_influxdb_token
INFLUXDB_ORG=your_influxdb_org
```

From the repository root, install and run the backend:

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --app-dir backend
```

In a second terminal, start the frontend:

```powershell
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite. The frontend uses `http://127.0.0.1:8000` for the backend by default. Set `VITE_API_BASE_URL` to use a different backend URL.

## API

- `GET /health` - backend and InfluxDB health status.
- `GET /api/aqi/current?lat=<latitude>&lon=<longitude>` - current AQI data from WAQI.
- `POST /location/update` - accepts latitude and longitude.

## Technology

React, TypeScript, Vite, Python, FastAPI, WAQI, and InfluxDB.
