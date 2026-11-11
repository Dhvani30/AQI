import asyncio
import math
import os
from pathlib import Path

import httpx
from dotenv import load_dotenv

load_dotenv(dotenv_path=Path(__file__).resolve().parents[1] / ".env")

WAQI_BASE_URL = "https://api.waqi.info"
REQUEST_TIMEOUT = httpx.Timeout(10.0)
POLLUTANT_KEYS = ("pm25", "pm10", "no2", "o3", "co")
SEARCH_RADII_KM = (10, 25, 50, 100)
IDW_POWER = 2


def _token() -> str:
    token = os.getenv("WAQI_API_TOKEN")
    if not token:
        raise RuntimeError("WAQI_API_TOKEN is not configured")
    return token


def extract_pollutants(feed: dict) -> dict:
    iaqi = feed.get("iaqi") or {}
    result = {}
    for key in POLLUTANT_KEYS:
        reading = iaqi.get(key)
        value = reading.get("v") if isinstance(reading, dict) else None
        unit = "WAQI sub-index"
        if isinstance(reading, dict):
            unit = reading.get("unit") or reading.get("u") or unit
        try:
            value = float(value) if value is not None else None
            if value is not None and not math.isfinite(value):
                value = None
        except (TypeError, ValueError):
            value = None
        result[key] = {"value": value, "unit": unit}
    return result


def extract_source_timestamp(feed: dict):
    time_info = feed.get("time") or {}
    return time_info.get("iso") or time_info.get("s")


def _numeric_aqi(value):
    try:
        aqi = float(value)
    except (TypeError, ValueError):
        return None
    return aqi if math.isfinite(aqi) and aqi >= 0 else None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    earth_radius_km = 6371.0
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )
    a = min(1.0, max(0.0, a))
    return earth_radius_km * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def idw_interpolate(lat: float, lon: float, stations: list[dict]):
    valid = []
    for station in stations:
        aqi = _numeric_aqi(station.get("aqi"))
        if aqi is None:
            continue
        distance = haversine_km(
            lat,
            lon,
            float(station["latitude"]),
            float(station["longitude"]),
        )
        valid.append((station, aqi, distance))

    if not valid:
        return None, "no_data", None, 0

    valid.sort(key=lambda item: item[2])
    nearest_distance = valid[0][2]
    if nearest_distance < 0.5:
        return valid[0][1], "station_direct", nearest_distance, 1
    if len(valid) < 2:
        return valid[0][1], "nearest_station_far", nearest_distance, 1

    weighted_sum = 0.0
    weight_total = 0.0
    for _, aqi, distance in valid:
        weight = 1 / (distance ** IDW_POWER)
        weighted_sum += weight * aqi
        weight_total += weight

    estimate = weighted_sum / weight_total
    return int(math.floor(estimate + 0.5)), "idw_interpolated", nearest_distance, len(valid)


def _confidence_for_distance(distance_km):
    if distance_km is None:
        return "none"
    if distance_km < 10:
        return "high"
    if distance_km < 50:
        return "medium"
    return "low"


async def _station_summaries(client, lat: float, lon: float, radius_km: float):
    lat_delta = radius_km / 111.32
    lon_delta = radius_km / (111.32 * max(abs(math.cos(math.radians(lat))), 0.01))
    north = min(90.0, lat + lat_delta)
    south = max(-90.0, lat - lat_delta)
    west = max(-180.0, lon - lon_delta)
    east = min(180.0, lon + lon_delta)
    bounds = f"{north},{west},{south},{east}"
    stations = await _get_json(
        client,
        "/v2/map/bounds/",
        {"latlng": bounds, "token": _token()},
    )

    filtered = []
    for station in stations:
        try:
            uid = int(station["uid"])
            station_lat = float(station["lat"])
            station_lon = float(station["lon"])
        except (KeyError, TypeError, ValueError):
            continue
        distance = haversine_km(lat, lon, station_lat, station_lon)
        if distance <= radius_km:
            filtered.append({
                **station,
                "uid": uid,
                "lat": station_lat,
                "lon": station_lon,
                "distance_km": distance,
            })

    filtered.sort(key=lambda station: station["distance_km"])
    return filtered


async def _enrich_stations(client, summaries: list[dict], limit: int = 8):
    async def enrich(station):
        station_id = station["uid"]
        summary = {
            "uid": station_id,
            "name": (station.get("station") or {}).get("name") or "Air quality station",
            "latitude": station["lat"],
            "longitude": station["lon"],
            "distance_km": round(station["distance_km"], 2),
            "aqi": station.get("aqi"),
            "dominant_pollutant": None,
            "pollutants": extract_pollutants({}),
            "source_timestamp": None,
        }
        try:
            detail = await _get_json(client, f"/feed/@{station_id}/", {"token": _token()})
            summary.update({
                "name": (detail.get("city") or {}).get("name") or summary["name"],
                "aqi": detail.get("aqi", summary["aqi"]),
                "dominant_pollutant": detail.get("dominentpol"),
                "pollutants": extract_pollutants(detail),
                "source_timestamp": extract_source_timestamp(detail),
            })
        except (httpx.HTTPError, RuntimeError, KeyError, ValueError, TypeError):
            pass
        return summary

    return await asyncio.gather(*(enrich(station) for station in summaries[:limit]))


async def get_waqi_spatial_data(lat: float, lon: float, max_radius_km: int = 100):
    radii = [radius for radius in SEARCH_RADII_KM if radius <= max_radius_km]
    if not radii or radii[-1] != max_radius_km:
        radii.append(max_radius_km)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        summaries = []
        search_radius_km = 0
        for radius in radii:
            search_radius_km = radius
            summaries = await _station_summaries(client, lat, lon, radius)
            numeric_count = sum(_numeric_aqi(station.get("aqi")) is not None for station in summaries)
            if numeric_count >= 2:
                break

        stations = await _enrich_stations(client, summaries)

    estimate, method, nearest_distance, stations_used = idw_interpolate(lat, lon, stations)
    confidence = _confidence_for_distance(nearest_distance)
    spatial_quality = {
        "method": method,
        "nearest_station_km": round(nearest_distance, 2) if nearest_distance is not None else None,
        "confidence": confidence,
        "stations_used": stations_used,
        "search_radius_km": search_radius_km,
    }

    nearest = next(
        (station for station in stations if _numeric_aqi(station.get("aqi")) is not None),
        None,
    )
    if nearest is None:
        return {
            "aqi": None,
            "pollutants": extract_pollutants({}),
            "source_timestamp": None,
            "stations": stations,
            "spatial_quality": spatial_quality,
        }

    result_aqi = _numeric_aqi(nearest.get("aqi")) if method == "station_direct" else estimate
    feed = {
        "aqi": result_aqi,
        "dominentpol": nearest.get("dominant_pollutant"),
        "city": {
            "name": nearest["name"]
            if method == "station_direct"
            else f"IDW estimate from {stations_used} stations"
            if method == "idw_interpolated"
            else nearest["name"]
        },
        "time": {"iso": nearest.get("source_timestamp")},
    }
    return {
        "aqi": feed,
        "pollutants": nearest["pollutants"],
        "source_timestamp": nearest.get("source_timestamp"),
        "stations": stations,
        "spatial_quality": spatial_quality,
    }


async def _get_json(client: httpx.AsyncClient, path: str, params: dict):
    response = await client.get(f"{WAQI_BASE_URL}{path}", params=params)
    response.raise_for_status()
    payload = response.json()
    if payload.get("status") != "ok":
        raise RuntimeError("WAQI did not return an OK response")
    return payload["data"]


async def get_waqi_data(lat: float, lon: float):
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        return await _get_json(
            client,
            f"/feed/geo:{lat};{lon}/",
            {"token": _token()},
        )


async def get_waqi_station_data(uid: int):
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        return await _get_json(client, f"/feed/@{uid}/", {"token": _token()})


async def get_waqi_stations(lat: float, lon: float, radius_km: float = 25):
    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        summaries = await _station_summaries(client, lat, lon, radius_km)
        return await _enrich_stations(client, summaries)
