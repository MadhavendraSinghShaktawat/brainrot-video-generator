import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { timelineActionSchema, TimelineAction } from '@/ai/actions';

const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });

interface PlanRequestBody { prompt: string }

export async function POST(req: NextRequest) {
  const { prompt } = (await req.json()) as PlanRequestBody;
  if (!prompt) {
    return NextResponse.json({ error: 'Missing prompt' }, { status: 400 });
  }

  // Call OpenAI with function calling so we get structured edits back
  const functionDef = {
    name: 'timeline_action',
    description: 'One or more edits that should be performed on the timeline',
    parameters: {
      type: 'object',
      properties: {
        actions: {
          type: 'array',
          items: /* inline JSON schema matching our zod */ {
            type: 'object',
            additionalProperties: true,
          },
        },
      },
      required: ['actions'],
    },
  } as const;

  const chat = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0,
    messages: [
      {
        role: 'system',
        content: `You are a video-editing assistant.
Return ONLY a function call named \'timeline_action\' whose \'actions\' argument is an array.
Each element must match one of these shapes (JSON, camelCase keys):
{"type":"trim","layer":1,"fromSec":2,"toSec":10}
{"type":"addAsset","assetKind":"image","query":"brain","layer":2,"atSec":11}
{"type":"move","id":"evt-id","toSec":5}
{"type":"layer","id":"evt-id","layer":3}
{"type":"transform","id":"evt-id","xPct":0.1,"yPct":-0.2,"scale":1.2}
{"type":"addCaption","text":"Hello","atSec":3,"duration":2,"layer":4}
{"type":"autoCaption","layer":3}`,
      },
      { role: 'user', content: prompt },
    ],
    functions: [functionDef],
    function_call: { name: 'timeline_action' },
  });
  let actions: TimelineAction[] = [];

  const tryParse = (raw: string | null | undefined) => {
    if (!raw) return null;
    try {
      const val = JSON.parse(raw);
      if (Array.isArray(val)) return val;
      if (Array.isArray(val.actions)) return val.actions;
    } catch {
      /* ignore */
    }
    return null;
  };

  const call = chat.choices[0].message.function_call;
  actions = tryParse(call?.arguments) ?? [];

  // fallback to content if model didn't call function
  if (!actions.length) {
    actions = tryParse(chat.choices[0].message.content) ?? [];
  }

  // validate
  try {
    actions = actions.map((a) => timelineActionSchema.parse(a));
  } catch (err) {
    console.error('Validation failed', err);
    return NextResponse.json([]);
  }

  return NextResponse.json(actions);
} 