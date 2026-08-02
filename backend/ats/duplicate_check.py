from rapidfuzz import fuzz
from ats.db import SupabaseATS

class DuplicateDetector:
    def __init__(self, db: SupabaseATS, name_threshold: int = 90):
        self.db = db
        self.name_threshold = name_threshold

    def check_duplicate(self, candidate_data: dict, job_opening_id: str) -> dict:
        """
        Validates whether the candidate is a duplicate for *this specific* job opening.
        """
        try:
            # Fetch all existing applications for this job joined with candidate data
            response = self.db.client.table('applications')\
                .select('id, candidates(name, email, phone)')\
                .eq('job_opening_id', job_opening_id)\
                .execute()
                
            if not hasattr(response, 'data') or not response.data:
                return {"is_duplicate": False}
        except Exception as e:
            print(f"Error fetching existing applications for deduplication: {e}")
            return {"is_duplicate": False}

        applications = response.data
        new_email = candidate_data.get('email', '')
        new_email = new_email.strip().lower() if new_email else ''
        
        new_phone = candidate_data.get('phone', '')
        new_phone = new_phone.strip().lower() if new_phone else ''
        
        new_name = candidate_data.get('name', '')
        new_name = new_name.strip().lower() if new_name else ''

        best_fuzzy_match = None
        best_score = 0

        for app in applications:
            cand = app.get('candidates', {})
            if not cand:
                continue
                
            existing_email = cand.get('email', '')
            existing_email = existing_email.strip().lower() if existing_email else ''
            
            existing_phone = cand.get('phone', '')
            existing_phone = existing_phone.strip().lower() if existing_phone else ''
            
            # 1. Exact match on email/phone -> Certain duplicate
            if (new_email and existing_email == new_email) or (new_phone and existing_phone == new_phone):
                return {
                    "is_duplicate": True,
                    "certainty": "exact",
                    "reason": "Exact match on email or phone",
                    "original_application_id": app['id']
                }

            # 2. Fuzzy match on name -> Flagged as possible duplicate
            existing_name = cand.get('name', '')
            existing_name = existing_name.strip().lower() if existing_name else ''
            if new_name and existing_name:
                score = fuzz.token_sort_ratio(new_name, existing_name)
                if score > best_score:
                    best_score = score
                    best_fuzzy_match = app['id']

        if best_score >= self.name_threshold:
            return {
                "is_duplicate": True,
                "certainty": "fuzzy",
                "reason": f"Fuzzy name match (score: {best_score})",
                "original_application_id": best_fuzzy_match
            }

        return {"is_duplicate": False}
