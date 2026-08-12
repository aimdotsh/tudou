from config import SQL_FILE, JSON_FILE
from generator import Generator
import json

if __name__ == "__main__":
    generator = Generator(SQL_FILE)
    activities_list = generator.loadForMapping()
    with open(JSON_FILE, "w") as f:
        json.dump(activities_list, f, indent=0)
    print(f"Successfully generated {len(activities_list)} activities to {JSON_FILE}")
