import json
import os
from datetime import datetime, timedelta
from pathlib import Path
from generate_gifs_python import GifGenerator

def main():
    # Setup paths
    project_root = Path(__file__).parent.parent
    activities_file = project_root / "src" / "static" / "activities.json"
    gif_dir = project_root / "assets" / "gif"
    
    # Initialize generator
    generator = GifGenerator(project_root)
    
    # Load activities
    print(f"Loading activities from {activities_file}...")
    with open(activities_file, 'r', encoding='utf-8') as f:
        activities = json.load(f)
    
    # Calculate date range (last 7 days from now)
    # Using the user's current time as reference if possible, or just system time
    # The metadata says 2025-12-06
    now = datetime.now()
    seven_days_ago = now - timedelta(days=7)
    
    print(f"Checking for missing GIFs since {seven_days_ago.strftime('%Y-%m-%d')}...")
    
    missing_activities = []
    
    for activity in activities:
        # Parse date
        try:
            start_date_str = activity['start_date_local'].split(' ')[0]
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d')
            
            if start_date >= seven_days_ago:
                gif_path = gif_dir / f"track_{start_date_str}.gif"
                if not gif_path.exists():
                    missing_activities.append({
                        'date': start_date_str,
                        'run_id': activity['run_id'],
                        'activity': activity
                    })
        except Exception as e:
            print(f"Error parsing date for activity {activity.get('run_id')}: {e}")
            continue
            
    if not missing_activities:
        print("No missing GIFs found for the last 7 days.")
        return

    print(f"Found {len(missing_activities)} missing GIFs.")
    
    # Generate GIFs
    success_count = 0
    for i, item in enumerate(missing_activities):
        try:
            # Check if summary_polyline exists
            if not item['activity'].get('summary_polyline'):
                print(f"Skipping {item['date']} - No summary polyline")
                continue
                
            print(f"Generating GIF for {item['date']}...")
            if generator.generate_single_gif(item, i, len(missing_activities)):
                success_count += 1
        except Exception as e:
            print(f"Failed to generate GIF for {item['date']}: {e}")

    print(f"Finished! Generated {success_count} GIFs.")

if __name__ == "__main__":
    main()
