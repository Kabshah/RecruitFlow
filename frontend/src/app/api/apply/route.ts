import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export async function POST(req: NextRequest) {
  const adminDb = createServerClient();
  try {
    const formData = await req.formData();

    // Honeypot check
    const honeypot = formData.get('hp_name');
    if (honeypot) {
      return NextResponse.json({ error: 'Bot detected' }, { status: 400 });
    }

    // File validation
    const file = formData.get('resume') as File;
    if (!file) {
      return NextResponse.json({ error: 'Resume file is required' }, { status: 400 });
    }
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size exceeds 5MB limit' }, { status: 400 });
    }
    const isExtensionValid = file.name.endsWith('.pdf') || file.name.endsWith('.docx') || file.name.endsWith('.doc');
    const validTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!validTypes.includes(file.type) && !isExtensionValid) {
      return NextResponse.json({ error: 'Only PDF and DOCX files are allowed.' }, { status: 400 });
    }

    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const phone = (formData.get('phone') as string) || '';
    const location = (formData.get('location') as string) || '';
    const linkedin_url = (formData.get('linkedin_url') as string) || '';
    const job_opening_id = formData.get('job_opening_id') as string;
    const consent_given =
      formData.get('consent_given') === 'on' || formData.get('consent_given') === 'true';

    if (!name || !email) {
      return NextResponse.json({ error: 'Name and Email are required' }, { status: 400 });
    }

    const reference_code = 'RF-' + Math.random().toString(36).substring(2, 7).toUpperCase();

    // 1. Upload resume to Supabase Storage
    let resume_file_url: string | null = null;
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      const { data: uploadData, error: uploadErr } = await adminDb.storage
        .from('resumes')
        .upload(fileName, fileBuffer, {
          contentType: file.type || 'application/pdf',
          upsert: true,
        });

      if (!uploadErr && uploadData) {
        resume_file_url = adminDb.storage.from('resumes').getPublicUrl(fileName).data.publicUrl;
      } else {
        console.warn('[Storage] Upload failed:', uploadErr?.message);
      }
    } catch (e) {
      console.warn('[Storage] Exception:', e);
    }

    // 2. Upsert candidate record
    let candidateId: string | null = null;
    const { data: existing } = await adminDb
      .from('candidates')
      .select('id')
      .eq('email', email)
      .single();

    if (existing) {
      candidateId = existing.id;
      await adminDb
        .from('candidates')
        .update({
          name,
          phone,
          location,
          linkedin_url,
          ...(resume_file_url ? { resume_file_url } : {}),
        })
        .eq('id', candidateId);
    } else {
      const { data: created } = await adminDb
        .from('candidates')
        .insert({
          name,
          email,
          phone,
          location,
          linkedin_url,
          resume_file_url,
          raw_resume_text: `Resume: ${file.name} (${Math.round(file.size / 1024)}KB)`,
        })
        .select()
        .single();
      if (created) candidateId = created.id;
    }

    // 3. Create application record (initially "New" — backend will update after scoring)
    const { data: appData } = await adminDb
      .from('applications')
      .insert({
        reference_code,
        candidate_id: candidateId,
        job_opening_id:
          job_opening_id && job_opening_id !== 'undefined' ? job_opening_id : null,
        application_stage: 'New',
        consent_given,
        consent_at: consent_given ? new Date().toISOString() : null,
        score: null,
        classification: 'Pending AI Evaluation',
        skill_gap_json: null,
      })
      .select()
      .single();

    const applicationId = appData?.id ?? null;

    // 4. Fire-and-forget: call Python backend /process to run the full AI pipeline.
    //    Non-blocking — candidate gets an instant response while AI processing happens in background.
    if (resume_file_url && candidateId && applicationId) {
      const backendPayload = {
        application_id: applicationId,
        candidate_id: candidateId,
        candidate_name: name,
        candidate_email: email,
        resume_file_url,
        job_opening_id:
          job_opening_id && job_opening_id !== 'undefined' ? job_opening_id : null,
        reference_code,
      };

      fetch(`${BACKEND_URL}/process`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backendPayload),
        signal: AbortSignal.timeout(180_000), // 3 min — allow for LLM scoring time
      })
        .then(async (res) => {
          const body = await res.json().catch(() => ({}));
          if (res.ok) {
            console.log(
              `[Backend] Pipeline complete for ${name} — score: ${body.score}, classification: ${body.classification}`,
            );
          } else {
            console.warn('[Backend] Pipeline returned error:', body);
          }
        })
        .catch((err) => {
          console.warn('[Backend] Failed to reach backend (non-fatal):', err?.message);
        });
    }

    return NextResponse.json({ success: true, reference_code });
  } catch (error: any) {
    console.error('[Intake Error]:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 },
    );
  }
}
