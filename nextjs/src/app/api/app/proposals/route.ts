import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import type { ProposalInsert, ProposalStage } from '@/lib/proposals';

const VALID_STAGES: ProposalStage[] = [
  'lead_received',
  'voice_memo_received',
  'processing',
  'ready_for_review',
  'sent',
  'signed',
];

export async function POST(request: Request) {
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
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const {
    customer_name,
    neighborhood,
    estimated_value,
    stage,
    walk_date,
    email,
  } = body as Record<string, unknown>;

  if (
    typeof customer_name !== 'string' ||
    customer_name.trim() === ''
  ) {
    return NextResponse.json(
      { error: 'customer_name, neighborhood, estimated_value, and stage are required' },
      { status: 400 },
    );
  }
  if (typeof neighborhood !== 'string' || neighborhood.trim() === '') {
    return NextResponse.json(
      { error: 'customer_name, neighborhood, estimated_value, and stage are required' },
      { status: 400 },
    );
  }
  if (
    typeof estimated_value !== 'number' ||
    !isFinite(estimated_value) ||
    estimated_value < 0
  ) {
    return NextResponse.json(
      { error: 'customer_name, neighborhood, estimated_value, and stage are required' },
      { status: 400 },
    );
  }
  if (
    typeof stage !== 'string' ||
    !(VALID_STAGES as string[]).includes(stage)
  ) {
    return NextResponse.json(
      { error: 'customer_name, neighborhood, estimated_value, and stage are required' },
      { status: 400 },
    );
  }

  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (
    typeof email !== 'string' ||
    email.trim() === '' ||
    !EMAIL_PATTERN.test(email.trim())
  ) {
    return NextResponse.json(
      { error: 'A valid email address is required' },
      { status: 400 },
    );
  }

  const insert: ProposalInsert = {
    customer_name: customer_name.trim(),
    neighborhood: neighborhood.trim(),
    estimated_value: estimated_value as number,
    stage: stage as string,
    owner: user.id,
    email: email.trim(),
    ...(typeof walk_date === 'string' && walk_date.trim() !== ''
      ? { walk_date: walk_date.trim() }
      : {}),
  };

  const { data, error } = await client
    .getSupabaseClient()
    .from('proposals')
    .insert(insert)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
