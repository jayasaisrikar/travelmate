import { NextRequest, NextResponse } from 'next/server';

import { generateText } from '@/services/gemini';
import type { GeneratedItinerary, ItineraryDayPlan } from '@/lib/travel-types';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ItineraryModification {
  dayIndex?: number;
  activityIndex?: number;
  action: 'add' | 'remove' | 'replace' | 'reorder';
  details?: Record<string, unknown>;
}

type ChatItinerary = Partial<
  Pick<GeneratedItinerary, 'destination' | 'duration' | 'tips'>
> & {
  dailyPlans?: ItineraryDayPlan[];
  daily_plans?: ItineraryDayPlan[];
};

function buildConversationPrompt(input: {
  message: string;
  itinerary: ChatItinerary;
  conversationHistory: ChatMessage[];
}): string {
  const dailyPlans = input.itinerary.dailyPlans ?? input.itinerary.daily_plans ?? [];
  const history = input.conversationHistory
    .map((entry) => `${entry.role}: ${entry.content}`)
    .join('\n');

  return `
You are a travel itinerary assistant helping a traveler refine an existing itinerary.

Current itinerary:
${JSON.stringify(
    {
      destination: input.itinerary.destination,
      duration: input.itinerary.duration,
      dailyPlans,
      tips: input.itinerary.tips ?? [],
    },
    null,
    2
  )}

Conversation so far:
${history || 'No prior conversation'}

Latest user message:
${input.message}

Instructions:
- Be concise, helpful, and specific to the existing itinerary.
- Prefer a short opening sentence, then 2 to 4 short bullet points.
- Use line breaks between sections.
- Refer to actual itinerary entries when possible.
- If the user is asking for a change, include one line that starts with "MODIFICATION:" and clearly describes the requested change.
- If you need confirmation, include one line that starts with "QUESTION:".
- Do not invent facts about places that are not in the itinerary context.
`.trim();
}

export async function POST(request: NextRequest) {
  try {
    const { message, itinerary, conversationHistory = [] } = await request.json();

    if (!message || !itinerary) {
      return NextResponse.json(
        { error: 'Message and itinerary are required' },
        { status: 400 }
      );
    }

    const reply = await generateText(
      buildConversationPrompt({
        message,
        itinerary,
        conversationHistory,
      })
    );

    let modifications: ItineraryModification | null = null;
    const questions: string[] = [];
    const visibleLines: string[] = [];

    for (const line of reply.split('\n')) {
      if (line.startsWith('MODIFICATION:')) {
        modifications = {
          action: 'replace',
          details: {
            description: line.replace('MODIFICATION:', '').trim(),
          },
        };
        continue;
      }

      if (line.startsWith('QUESTION:')) {
        questions.push(line.replace('QUESTION:', '').trim());
        continue;
      }

      visibleLines.push(line);
    }

    return NextResponse.json({
      message: visibleLines.join('\n').trim(),
      modifications,
      questions,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
