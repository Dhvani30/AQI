import os
from wsgiref import headers
import httpx
from dotenv import load_dotenv
load_dotenv()

async def get_waqi_data(lat: float, lon: float):
    waqi_api_token = os.getenv("WAQI_API_TOKEN")
    url = f"https://api.waqi.info/feed/geo:{lat};{lon}/?token={waqi_api_token}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        data = response.json()
        if data["status"] == "ok":
            return data["data"]
        else:
            raise Exception("Failed to fetch AQI data")

async def get_openaq_data(lat: float, lon: float):
    openaq_api_key = os.getenv("OPENAQ_API_KEY")
    url=f"https://api.openaq.org/v2/latest?coordinates={lat},{lon}&radius=10000"
    headers={"X-API-Key": openaq_api_key}

    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers)
        data = response.json()
        if "results" in data and len(data["results"]) > 0:
            return data["results"]
        else:
            raise Exception("Failed to fetch OpenAQ data")