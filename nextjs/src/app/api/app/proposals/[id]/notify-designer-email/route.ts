import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import { sendDesignerNotificationEmail } from '@/lib/email';
import { parseTextQuote } from '@/lib/quote';

// const DESIGNER_NOTIFY_THRESHOLD = 30000;

export async function POST(
  _request: Request,
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

  const { data: proposal, error: fetchError } = await client
    .getSupabaseClient()
    .from('proposals')
    .select('quote, customer_name, neighborhood')
    .eq('id', id)
    .eq('owner', user.id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!proposal.quote) {
    return NextResponse.json({ error: 'No quote to notify about' }, { status: 400 });
  }

  const services = parseTextQuote(proposal.quote);
  // const total = calculateQuoteTotal(services);

  // if (total <= DESIGNER_NOTIFY_THRESHOLD) {
  //   return NextResponse.json(
  //     { error: 'Quote total does not exceed threshold' },
  //     { status: 400 },
  //   );
  // }

  const { data: settings } = await client
    .getSupabaseClient()
    .from('app_settings')
    .select('designer_email')
    .eq('owner', user.id)
    .maybeSingle();

  const designerEmail = settings?.designer_email ?? '';

  if (!designerEmail || designerEmail.trim() === '') {
    return NextResponse.json(
      { error: 'No designer email configured. Please set it in Settings.' },
      { status: 400 },
    );
  }

  try {
    await sendDesignerNotificationEmail(
      designerEmail,
      proposal.customer_name,
      proposal.neighborhood,
      services,
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
