import json
import os
import re

# Define file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SOURCE_FILE = os.path.join(BASE_DIR, 'src', 'static', 'activities.json')
TARGET_FILE = os.path.join(BASE_DIR, 'src', 'static', 'activities_py4567.json')

def merge_descriptions():
    if not os.path.exists(SOURCE_FILE):
        print(f"Error: Source file {SOURCE_FILE} does not exist.")
        return
    if not os.path.exists(TARGET_FILE):
        print(f"Error: Target file {TARGET_FILE} does not exist.")
        return

    print("Loading source activities...")
    with open(SOURCE_FILE, 'r', encoding='utf-8') as f:
        source_data = json.load(f)

    # Create a map of run_id -> description
    description_map = {}

    for activity in source_data:
        run_id = activity.get('run_id')
        description = activity.get('description')
        if run_id and description:
            # Clean description
            # Remove "Powered By www.gearaut.com" (case insensitive just in case, though user specified exact)
            description = description.replace("Powered By www.gearaut.com", "")
            # Remove "训练负荷：XX；" pattern
            description = re.sub(r"训练负荷：\d+[；;]?", "", description)
            # Strip whitespace
            description = description.strip()
            
            description_map[run_id] = description

    print(f"Found {len(description_map)} activities with descriptions.")

    print("Loading target activities...")
    with open(TARGET_FILE, 'r', encoding='utf-8') as f:
        target_data = json.load(f)

    updated_count = 0
    for activity in target_data:
        run_id = activity.get('run_id')
        if run_id in description_map:
            activity['description'] = description_map[run_id]
            updated_count += 1
    
    print(f"Updated {updated_count} activities in target file.")

    print("Saving updated target file...")
    with open(TARGET_FILE, 'w', encoding='utf-8') as f:
        json.dump(target_data, f, indent=0, ensure_ascii=False)
    
    print("Done.")

if __name__ == "__main__":
    merge_descriptions()
