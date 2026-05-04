import { NextResponse } from 'next/server';
import { createSSRSassClient } from '@/lib/supabase/server';
import { parseTextQuote, calculateQuoteTotal } from '@/lib/quote';

const QUOTE_THRESHOLD = 30000;

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
    .select('quote, owner')
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
  const total = calculateQuoteTotal(services);

  if (total <= QUOTE_THRESHOLD) {
    return NextResponse.json(
      { error: 'Quote total does not exceed threshold' },
      { status: 400 },
    );
  }

  const webhookUrl = process.env.PRIVATE_SLACK_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: 'Slack webhook URL not configured.' }, { status: 500 });
  }

  const slackResponse = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Urgent! Details on your email.' }),
  });

  if (!slackResponse.ok) {
    const errorBody = await slackResponse.text();
    return NextResponse.json(
      { error: `Slack notification failed: ${errorBody}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
