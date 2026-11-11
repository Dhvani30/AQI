import os
import httpx
from dotenv import load_dotenv
load_dotenv()

async def get_weather_data(lat: float, lon: float):
    key= os.getenv("OPENWEATHERMAP_API_KEY")
    url= f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={key}&units=metric"

    async with httpx.AsyncClient() as client:
        response= await client.get(url)
        data= response.json()

        if response.status_code==200:
            return{
                "temperature": data["main"]["temp"],
                "humidity": data["main"]["humidity"],
                "pressure": data["main"]["pressure"],
                "weather": data["weather"][0]["description"],
                "wind_speed": data["wind"]["speed"],
                "wind_direction": data["weather"][0]["main"]
            }
        return None