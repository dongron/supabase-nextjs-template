import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createSSRSassClient } from "@/lib/supabase/server";
import { normalizePrice, type QuoteService } from "@/lib/quote";

const SYSTEM_PROMPT = `You are a landscaping services estimator. Extract all services and their prices mentioned in the voice memo. Use the provided services catalog to match each extracted service to a catalog entry by name (set serviceId to the matching catalog id, or null if no match). In some cases, names are not exact match with a catalogue, use your best judgment to find the closest match. For the price: use the price explicitly mentioned in the voice memo if present; otherwise use the catalog entry's default_price if the service matched; otherwise set price to null. Extract prices as plain numbers (no currency symbols).`;

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch prospect (owner check included)
  const { data: prospect, error: prospectError } = await client
    .getSupabaseClient()
    .from("proposals")
    .select("id, voice_memo")
    .eq("id", id)
    .eq("owner", user.id)
    .single();

  if (prospectError || !prospect) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!prospect.voice_memo || prospect.voice_memo.trim() === "") {
    return NextResponse.json(
      { error: "No voice memo saved for this prospect" },
      { status: 400 },
    );
  }

  // Fetch services catalog
  const { data: services } = await client
    .getSupabaseClient()
    .from("services")
    .select("id, name, default_price")
    .eq("owner", user.id);

  const catalog = services ?? [];

  const userMessage = `Voice memo:\n"""\n${prospect.voice_memo}\n"""\n\nServices catalog (match by name to find serviceId):\n${JSON.stringify(catalog)}`;

  const anthropicClient = new Anthropic({
    apiKey: process.env.PRIVATE_CALUDE_API_KEY,
  });

  try {
    const response = await anthropicClient.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: [
        {
          name: "extract_services",
          description: "Extract services and prices from the voice memo",
          input_schema: {
            type: "object" as const,
            properties: {
              services: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    serviceId: { type: ["string", "null"] },
                    serviceName: { type: "string" },
                    price: { type: ["number", "null"] },
                  },
                  required: ["serviceId", "serviceName", "price"],
                },
              },
            },
            required: ["services"],
          },
        },
      ],
      tool_choice: { type: "any" },
      messages: [{ role: "user", content: userMessage }],
    });

    const toolUseBlock = response.content.find(
      (block) => block.type === "tool_use",
    );
    if (!toolUseBlock || toolUseBlock.type !== "tool_use") {
      return NextResponse.json(
        { error: "Claude did not return a valid services list" },
        { status: 422 },
      );
    }

    const input = toolUseBlock.input as { services?: unknown };
    if (!Array.isArray(input.services)) {
      return NextResponse.json(
        { error: "Claude did not return a valid services list" },
        { status: 422 },
      );
    }

    const extractedServices: QuoteService[] = (
      input.services as Array<{
        serviceId: unknown;
        serviceName: unknown;
        price: unknown;
      }>
    ).map((s) => ({
      serviceId: typeof s.serviceId === "string" ? s.serviceId : null,
      serviceName: typeof s.serviceName === "string" ? s.serviceName : "",
      price: normalizePrice(
        typeof s.price === "number" || typeof s.price === "string" ? s.price : null,
      ),
    }));

    return NextResponse.json({ services: extractedServices });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "Failed to generate quote" },
        { status: 500 },
      );
    }
    return NextResponse.json(
      { error: "Failed to generate quote: " + (err instanceof Error ? err.message : String(err)) },
      { status: 500 },
    );
  }
}

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
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("services" in body) ||
    !Array.isArray((body as Record<string, unknown>).services)
  ) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const rawServices = (
    body as {
      services: Array<{
        serviceId: unknown;
        serviceName: unknown;
        price: unknown;
      }>;
    }
  ).services;

  const normalized: QuoteService[] = rawServices.map((s) => ({
    serviceId: typeof s.serviceId === "string" ? s.serviceId : null,
    serviceName: typeof s.serviceName === "string" ? s.serviceName : "",
    price: normalizePrice(s.price as string | number | null),
  }));

  const sum = normalized.reduce((acc, s) => acc + (s.price ?? 0), 0);
  const lines = normalized.map((s) => {
    const priceStr = s.price !== null ? String(s.price) : "—";
    return `- ${s.serviceName} - ${priceStr}`;
  });
  lines.push(`Total: ${sum}`);
  const quoteText = lines.join("\n");

  const { data, error } = await client
    .getSupabaseClient()
    .from("proposals")
    .update({ quote: quoteText })
    .eq("id", id)
    .eq("owner", user.id)
    .select("quote")
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(
      { error: "Failed to save quote" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ quote: data.quote });
}
