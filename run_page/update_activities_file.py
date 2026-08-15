from config import SQL_FILE, JSON_FILE, FIT_FOLDER, GPX_FOLDER
from generator import Generator
import json
import os

if __name__ == "__main__":
    generator = Generator(SQL_FILE)
    if os.path.exists(FIT_FOLDER):
        generator.sync_from_data_dir(FIT_FOLDER, file_suffix="fit")
    if os.path.exists(GPX_FOLDER):
        generator.sync_from_data_dir(GPX_FOLDER, file_suffix="gpx")

    activities_list = generator.loadForMapping()
    with open(JSON_FILE, "w") as f:
        json.dump(activities_list, f, indent=0)
    print(f"Successfully generated {len(activities_list)} activities to {JSON_FILE}")
