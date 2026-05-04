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
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (
    typeof body !== 'object' ||
    body === null ||
    !('voice_memo' in body)
  ) {
    return NextResponse.json({ error: 'Missing voice_memo field' }, { status: 400 });
  }

  const { voice_memo } = body as Record<string, unknown>;

  if (voice_memo !== null && typeof voice_memo !== 'string') {
    return NextResponse.json(
      { error: 'voice_memo must be a string or null' },
      { status: 400 },
    );
  }

  const { data, error } = await client
    .getSupabaseClient()
    .from('proposals')
    .update({ voice_memo: voice_memo as string | null })
    .eq('id', id)
    .eq('owner', user.id)
    .select('voice_memo')
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ voice_memo: data.voice_memo });
}
