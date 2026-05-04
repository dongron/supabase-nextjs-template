import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import { type ProposalStage } from '@/lib/proposals';

const VALID_STAGES: ProposalStage[] = [
  'lead_received',
  'voice_memo_received',
  'processing',
  'ready_for_review',
  'sent',
  'signed',
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const client = await createSSRSassClient();
  const {
    data: { user },
  } = await client.getSupabaseClient().auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('stage' in body) ||
    typeof (body as Record<string, unknown>).stage !== 'string' ||
    !(VALID_STAGES as string[]).includes((body as Record<string, unknown>).stage as string)
  ) {
    return NextResponse.json(
      { error: `stage must be one of: ${VALID_STAGES.join(', ')}` },
      { status: 400 },
    );
  }

  const stage = (body as Record<string, unknown>).stage as ProposalStage;

  const { data, error } = await client
    .getSupabaseClient()
    .from('proposals')
    .update({ stage, stage_entered_at: new Date().toISOString() })
    .eq('id', id)
    .eq('owner', user.id)
    .select('stage, stage_entered_at')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Failed to update stage' }, { status: 500 });
  }

  return NextResponse.json(data);
}
