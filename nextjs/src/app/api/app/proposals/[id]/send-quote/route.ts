import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import { sendCustomerQuoteEmail } from '@/lib/email';
import { parseTextQuote } from '@/lib/quote';

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
    .select('email, quote, customer_name, quote_sent')
    .eq('id', id)
    .eq('owner', user.id)
    .single();

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
  }

  if (!proposal.quote) {
    return NextResponse.json({ error: 'No quote to send' }, { status: 400 });
  }

  if (!proposal.email || proposal.email.trim() === '') {
    return NextResponse.json(
      { error: 'No customer email address on this proposal' },
      { status: 400 },
    );
  }

  const services = parseTextQuote(proposal.quote);

  try {
    await sendCustomerQuoteEmail(proposal.email, proposal.customer_name, services);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to send email';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const { error: updateError } = await client
    .getSupabaseClient()
    .from('proposals')
    .update({ quote_sent: true })
    .eq('id', id)
    .eq('owner', user.id);

  if (updateError) {
    // Email was sent — log but do not fail the request
    console.error('Failed to mark quote_sent:', updateError.message);
  }

  return NextResponse.json({ ok: true });
}
