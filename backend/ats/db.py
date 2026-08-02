import os
from supabase import create_client, Client

class SupabaseATS:
    def __init__(self):
        url = os.getenv("SUPABASE_URL")
        key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
        if not url or not key:
            raise ValueError("Supabase credentials not configured in environment variables.")
        self.client: Client = create_client(url, key)

    def insert_candidate(self, candidate_data: dict) -> str:
        """
        Inserts a normalized candidate dictionary into the candidates table and returns the new candidate ID.
        """
        response = self.client.table('candidates').insert(candidate_data).execute()
        if hasattr(response, 'data') and response.data:
            return response.data[0]['id']
        raise RuntimeError(f"Failed to insert candidate: {response}")

    def insert_application(self, application_data: dict) -> str:
        """
        Inserts an application connecting a candidate ID to a job_opening ID and returns the application ID.
        """
        response = self.client.table('applications').insert(application_data).execute()
        if hasattr(response, 'data') and response.data:
            return response.data[0]['id']
        raise RuntimeError(f"Failed to insert application: {response}")
        
    def get_job_openings(self) -> list:
        """
        Returns a list of all current job openings.
        """
        response = self.client.table('job_openings').select('*').execute()
        if hasattr(response, 'data'):
            return response.data
        return []
        
    def check_application_status(self, email: str, reference_code: str) -> dict:
        """
        Looks up application status via candidate email and application reference_code.
        """
        # Join applications with candidates to check email match
        response = self.client.table('applications').select(
            "*, candidates!inner(email)"
        ).eq('reference_code', reference_code).eq('candidates.email', email).execute()

        if hasattr(response, 'data') and response.data:
            return response.data[0]
        return None

    def get_booked_interview_slots(self) -> list[str]:
        """
        Returns all non-null interview_datetime values from the applications table.
        Used by CalendarManager to enforce the 15-min buffer between candidates.
        """
        response = self.client.table('applications').select('interview_datetime').not_.is_('interview_datetime', 'null').execute()
        if hasattr(response, 'data') and response.data:
            return [row['interview_datetime'] for row in response.data if row.get('interview_datetime')]
        return []

    def delete_candidate(self, candidate_id: str):
        """
        Cascaded deletion of a candidate and all their associated data.
        """
        try:
            # 1. Fetch candidate to get resume URL
            cand_res = self.client.table('candidates').select('resume_file_url').eq('id', candidate_id).single().execute()
            resume_url = None
            if hasattr(cand_res, 'data') and cand_res.data:
                resume_url = cand_res.data.get('resume_file_url')

            # 2. Find all associated applications
            app_res = self.client.table('applications').select('id').eq('candidate_id', candidate_id).execute()
            application_ids = [app['id'] for app in app_res.data] if hasattr(app_res, 'data') else []

            if application_ids:
                # 3. Delete dependent records (questions, email logs)
                self.client.table('interview_questions').delete().in_('application_id', application_ids).execute()
                self.client.table('email_log').delete().in_('application_id', application_ids).execute()

                # 4. Delete applications
                self.client.table('applications').delete().in_('id', application_ids).execute()

            # 5. Delete the candidate record
            self.client.table('candidates').delete().eq('id', candidate_id).execute()

            # 6. Delete the resume file from Storage if it exists
            if resume_url:
                # Extract path from URL (assuming format: .../storage/v1/object/public/resumes/filename)
                # The exact extraction depends on how Supabase URLs are stored,
                # but generally we want the path after the bucket name.
                path = resume_url.split('/resumes/')[-1] if '/resumes/' in resume_url else None
                if path:
                    self.client.storage.from_('resumes').remove([path])

            return True
        except Exception as e:
            print(f"Error during candidate deletion: {e}")
            raise e
