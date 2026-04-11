import httpx
import asyncio
import os
from dotenv import load_dotenv

load_dotenv('backend/.env')
api_token = os.getenv('TREFLE_API_TOKEN')

async def test_trefle():
    print(f"Testing Trefle.io with token: {api_token[:5]}...")
    # Try to search for a common plant (e.g., Coconut)
    url = f"https://trefle.io/api/v1/plants/search?token={api_token}&q=coconut"
    
    try:
        async with httpx.AsyncClient() as client:
            response = await client.get(url, timeout=10.0)
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"Success! Found {data['meta']['total']} plants.")
            else:
                print(f"Error: {response.text}")
    except Exception as e:
        print(f"Exception: {str(e)}")

if __name__ == "__main__":
    asyncio.run(test_trefle())
