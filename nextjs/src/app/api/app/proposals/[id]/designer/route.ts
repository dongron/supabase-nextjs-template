import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';

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
    return NextResponse.json(
      { error: 'designer_eta is required and must be a valid ISO 8601 datetime' },
      { status: 400 },
    );
  }

  const { designer_eta } = body as Record<string, unknown>;
  if (typeof designer_eta !== 'string' || designer_eta.trim() === '') {
    return NextResponse.json(
      { error: 'designer_eta is required and must be a valid ISO 8601 datetime' },
      { status: 400 },
    );
  }
  const etaDate = new Date(designer_eta);
  if (isNaN(etaDate.getTime())) {
    return NextResponse.json(
      { error: 'designer_eta is required and must be a valid ISO 8601 datetime' },
      { status: 400 },
    );
  }

  // Fetch proposal scoped to authenticated user
  const { data: proposal, error: fetchError } = await client
    .getSupabaseClient()
    .from('proposals')
    .select('id, render_required, owner')
    .eq('id', id)
    .eq('owner', user.id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!proposal.render_required) {
    return NextResponse.json(
      { error: 'Render is not required for this proposal' },
      { status: 422 },
    );
  }

  const now = new Date().toISOString();
  const { data: updated, error: updateError } = await client
    .getSupabaseClient()
    .from('proposals')
    .update({
      designer_notified: true,
      designer_notified_at: now,
      designer_eta: etaDate.toISOString(),
    })
    .eq('id', id)
    .eq('owner', user.id)
    .select('id, designer_notified, designer_notified_at, designer_eta')
    .single();

  if (updateError || !updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 });
  }

  return NextResponse.json(updated, { status: 200 });
}
