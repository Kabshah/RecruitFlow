import os
import json
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Warning: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env to run seeding.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def seed_job_openings():
    print("Seeding job openings...")
    try:
        with open("seed/job_openings.json", "r") as f:
            job_openings = json.load(f)
        
        response = supabase.table("job_openings").insert(job_openings).execute()
        print(f"Successfully inserted {len(response.data)} job openings.")
    except Exception as e:
        print(f"Error seeding job openings: {e}")

if __name__ == "__main__":
    seed_job_openings()
