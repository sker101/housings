import { corsHeaders, json, parseJsonSafe, withCors } from '../_shared/cors.ts';

function extractResponseText(payload: Record<string, unknown>): string {
  const direct = payload?.output_text;
  if (typeof direct === 'string' && direct.trim()) {
    return direct;
  }

  const output = Array.isArray(payload?.output) ? payload.output : [];

  for (const item of output) {
    const content = Array.isArray((item as Record<string, unknown>)?.content)
      ? ((item as Record<string, unknown>).content as Array<Record<string, unknown>>)
      : [];

    for (const chunk of content) {
      if (typeof chunk?.text === 'string' && chunk.text.trim()) {
        return chunk.text;
      }
      if (typeof chunk?.output_text === 'string' && chunk.output_text.trim()) {
        return chunk.output_text;
      }
    }
  }

  return '';
}

function parseStructuredResult(rawText: string) {
  const trimmed = rawText.trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    return null;
  }

  const jsonText = trimmed.slice(start, end + 1);
  return parseJsonSafe<Record<string, unknown>>(jsonText);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return withCors('ok', 200, corsHeaders);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405);
  }

  const payload = await req.json().catch(() => null);
  const imageUrl = payload?.imageUrl;
  const expectedAngle = String(payload?.expectedAngle || '').toLowerCase();

  if (!imageUrl || typeof imageUrl !== 'string') {
    return json({ error: 'imageUrl is required' }, 400);
  }

  const openAiApiKey = Deno.env.get('OPENAI_API_KEY');
  const model = Deno.env.get('OPENAI_VISION_MODEL') || 'gpt-4.1-mini';

  if (!openAiApiKey) {
    // Fail-open mode for environments where AI is not configured.
    return json({ pass: null, confidence: null, reason: 'OPENAI_API_KEY not configured' });
  }

  try {
    const instruction = [
      'You evaluate rental listing photos for moderation.',
      `Expected room angle: ${expectedAngle || 'unspecified'}.`,
      'Return strict JSON only with keys: pass (boolean), confidence (0..1), reason (short string).',
      'Use pass=false when the image clearly does not match the expected angle or is unusable.'
    ].join(' ');

    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'user',
            content: [
              { type: 'input_text', text: instruction },
              { type: 'input_image', image_url: imageUrl }
            ]
          }
        ]
      })
    });

    const openAiPayload = (await response.json().catch(() => null)) as Record<string, unknown> | null;

    if (!response.ok || !openAiPayload) {
      return json(
        {
          error: 'OpenAI request failed',
          details:
            (openAiPayload as Record<string, unknown> | null)?.error ?? `HTTP ${response.status}`
        },
        502
      );
    }

    const rawText = extractResponseText(openAiPayload);
    const parsed = parseStructuredResult(rawText);

    if (!parsed) {
      return json({
        pass: null,
        confidence: null,
        reason: 'Could not parse model output',
        raw: rawText
      });
    }

    const pass = typeof parsed.pass === 'boolean' ? parsed.pass : null;
    const confidenceValue =
      typeof parsed.confidence === 'number'
        ? Math.max(0, Math.min(1, parsed.confidence))
        : null;
    const reason = typeof parsed.reason === 'string' ? parsed.reason : 'No reason provided';

    return json({
      pass,
      confidence: confidenceValue,
      reason
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unexpected error' }, 500);
  }
});
