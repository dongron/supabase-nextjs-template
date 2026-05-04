import { NextRequest, NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: serviceId } = await params;

  const client = await createSSRSassClient();
  const {
    data: { user },
  } = await client.getSupabaseClient().auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = client.getSupabaseClient();

  const { error } = await supabase
    .from('services')
    .delete()
    .eq('id', serviceId)
    .eq('owner', user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ deleted: serviceId });
}
