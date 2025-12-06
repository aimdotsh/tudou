import requests
import io
from PIL import Image

def test_map_fetch():
    # Key from const.ts
    key = 'Gt5R0jT8tuIYxW6sNrAg'
    style = 'dataviz-light'
    # Random bbox (Beijing area)
    bbox = "116.3,39.9,116.4,40.0"
    width, height = 400, 400
    
    url = f"https://api.maptiler.com/maps/{style}/static/{bbox}/{width}x{height}.png?key={key}&attribution=false"
    print(f"Testing URL: {url}")
    
    try:
        # Try without headers first
        response = requests.get(url)
        print(f"Status (No Header): {response.status_code}")
        if response.status_code != 200:
            print(f"Response: {response.text}")
            
        # Try with Referer if failed
        if response.status_code != 200:
            headers = {'Referer': 'http://localhost:3000/'}
            print("Retrying with Referer: http://localhost:3000/")
            response = requests.get(url, headers=headers)
            print(f"Status (With Referer): {response.status_code}")
            if response.status_code != 200:
                 print(f"Response: {response.text}")

        if response.status_code == 200:
            print("✅ Fetch Success!")
            img = Image.open(io.BytesIO(response.content))
            print(f"Image mode: {img.mode}, Size: {img.size}")
            # Check if it looks empty (simple check, maybe average color)
            extrema = img.getextrema()
            print(f"Extrema: {extrema}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_map_fetch()
