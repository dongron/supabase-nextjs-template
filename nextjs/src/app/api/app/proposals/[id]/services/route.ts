import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';

type ServiceEntry = {
  service_id: string;
  price: number;
};

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: prospectId } = await params;

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

  const { services } = body as Record<string, unknown>;

  if (!Array.isArray(services)) {
    return NextResponse.json(
      { error: 'services must be an array' },
      { status: 400 },
    );
  }

  // Validate each entry before touching the database.
  for (const entry of services) {
    if (typeof (entry as ServiceEntry).service_id !== 'string' || !(entry as ServiceEntry).service_id) {
      return NextResponse.json(
        { error: 'Each service entry must have a non-empty service_id string' },
        { status: 400 },
      );
    }
    const price = Number((entry as ServiceEntry).price);
    if (!isFinite(price) || price < 0) {
      return NextResponse.json(
        { error: 'Each service entry price must be a finite non-negative number' },
        { status: 400 },
      );
    }
  }

  const supabase = client.getSupabaseClient();

  // Verify the prospect belongs to this user before writing (ownership check).
  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .select('id')
    .eq('id', prospectId)
    .eq('owner', user.id)
    .single();

  if (proposalError || !proposal) {
    return NextResponse.json({ error: 'Prospect not found' }, { status: 404 });
  }

  const rows = (services as ServiceEntry[]).map((entry) => ({
    prospect_id: prospectId,
    service_id: entry.service_id,
    price: Number(entry.price),
    updated_at: new Date().toISOString(),
  }));

  if (rows.length === 0) {
    return NextResponse.json({ updated: 0 });
  }

  const { data, error } = await supabase
    .from('prospect_services')
    .upsert(rows, { onConflict: 'prospect_id,service_id' })
    .select('service_id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
