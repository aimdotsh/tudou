import sqlite3
import re
import os

DB_PATH = 'run_page/data.db'

def clean_database():
    if not os.path.exists(DB_PATH):
        print(f"Database not found at {DB_PATH}")
        return

    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()

    # Select all activities with content in description
    cursor.execute("SELECT run_id, description FROM activities WHERE description IS NOT NULL AND description != ''")
    rows = cursor.fetchall()

    print(f"Scanning {len(rows)} records...")

    updated_count = 0
    for run_id, description in rows:
        original_desc = description
        
        # Cleaning logic
        # 1. Remove "Powered By www.gearaut.com"
        description = description.replace("Powered By www.gearaut.com", "")
        # 2. Remove "训练负荷：XX；" using regex
        description = re.sub(r"训练负荷：\d+[；;]?", "", description)
        # 3. Trim whitespace
        description = description.strip()

        if description != original_desc:
            cursor.execute("UPDATE activities SET description = ? WHERE run_id = ?", (description, run_id))
            updated_count += 1
            # print(f"Updated {run_id}")

    conn.commit()
    conn.close()

    print(f"Successfully cleaned {updated_count} records in {DB_PATH}.")

if __name__ == "__main__":
    clean_database()
