import { NextRequest, NextResponse } from 'next/server';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';

async function callGemini(prompt: string) {
  try {
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=' + GEMINI_API_KEY,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) {
      console.error('Gemini API error:', response.status);
      return null;
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || null;
  } catch (error) {
    console.error('Gemini error:', error);
    return null;
  }
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface ItineraryModification {
  dayIndex?: number;
  activityIndex?: number;
  action: 'add' | 'remove' | 'replace' | 'reorder';
  details?: any;
}

export async function POST(req: NextRequest) {
  try {
    const { message, itinerary, conversationHistory } = await req.json();

    if (!message || !itinerary) {
      return NextResponse.json(
        { error: 'Message and itinerary required' },
        { status: 400 }
      );
    }

    // Build context from itinerary
    const itineraryContext = `
Current Itinerary for ${itinerary.destination} (${itinerary.duration} days):

${itinerary.dailyPlans
  .map(
    (day: any) => `
Day ${day.day}: ${day.theme}
${day.activities
  .map(
    (act: any) => `- ${act.time}: ${act.name} (${act.duration}min, $${act.cost}) - ${act.description}`
  )
  .join('\n')}
`
  )
  .join('\n')}

Total Estimated Cost: $${itinerary.dailyPlans
      .reduce(
        (sum: number, day: any) =>
          sum + day.activities.reduce((s: number, a: any) => s + a.cost, 0),
        0
      )
      .toFixed(2)}

Travel Tips: ${itinerary.tips.slice(0, 3).join(', ')}
`;

    // Build conversation context
    const conversationContext =
      conversationHistory && conversationHistory.length > 0
        ? `Previous conversation:\n${conversationHistory
            .map((msg: ChatMessage) => `${msg.role}: ${msg.content}`)
            .join('\n')}\n\n`
        : '';

    // Determine response type based on user message
    let prompt = '';

    if (
      message.toLowerCase().includes('satisfied') ||
      message.toLowerCase().includes('happy') ||
      message.toLowerCase().includes('perfect') ||
      message.toLowerCase().includes('yes') ||
      message.toLowerCase().includes('good')
    ) {
      // User is satisfied - ask confirmation questions
      prompt = `You are a friendly travel itinerary assistant. The user seems satisfied with their itinerary.

${itineraryContext}

${conversationContext}

User just said: "${message}"

Ask 2-3 follow-up questions to confirm they're happy and ask about any final tweaks:
1. Ask if they want to make any small adjustments
2. Ask about accommodations/transportation preferences
3. Ask if they need any practical tips for the trip

Be conversational and warm. Keep response to 2-3 sentences max.`;
    } else if (
      message.toLowerCase().includes('change') ||
      message.toLowerCase().includes('replace') ||
      message.toLowerCase().includes('swap') ||
      message.toLowerCase().includes('different') ||
      message.toLowerCase().includes('add') ||
      message.toLowerCase().includes('remove')
    ) {
      // User wants modifications
      prompt = `You are a travel itinerary modification expert.

${itineraryContext}

${conversationContext}

User wants to modify their itinerary: "${message}"

1. Understand what they want to change
2. Suggest specific modifications (e.g., "I can replace the 15:00 Araku Valley Trek with a shorter city tour")
3. Ask clarifying questions if needed
4. Be helpful and flexible

Respond with:
- MODIFICATION: [describe the change clearly]
- QUESTION: [ask if they want this change]
- ALTERNATIVE: [suggest 1-2 alternatives if relevant]

Keep it concise and actionable.`;
    } else if (message.toLowerCase().includes('question') || message.toLowerCase().includes('?')) {
      // User has questions
      prompt = `You are a knowledgeable travel assistant.

${itineraryContext}

${conversationContext}

User asked: "${message}"

Answer their question about the itinerary:
1. Be specific and helpful
2. Reference actual attractions/times from their itinerary
3. Provide practical advice (crowds, timing, tips)
4. Ask if they want to adjust anything based on your answer

Keep response to 2-3 sentences.`;
    } else {
      // General feedback/thoughts
      prompt = `You are a friendly travel planning assistant.

${itineraryContext}

${conversationContext}

User said: "${message}"

Respond naturally:
1. Acknowledge their comment
2. Ask if they'd like any changes to their itinerary
3. Suggest 1 improvement based on their input (if applicable)
4. Ask if they're satisfied with the itinerary overall

Keep it conversational and brief.`;
    }

    // Call Gemini
    const response = await callGemini(prompt);

    if (!response) {
      // Fallback response if Gemini fails
      return NextResponse.json({
        message:
          "I'm having trouble connecting right now, but I'm here to help! You can ask me about your itinerary or let me know if you'd like to make any changes. What would you like to adjust?",
        modifications: null,
        questions: []
      });
    }

    // Parse response for modifications
    let modifications: ItineraryModification | null = null;
    let extractedQuestions: string[] = [];

    if (response.includes('MODIFICATION:')) {
      const modText = response.split('MODIFICATION:')[1]?.split('\n')[0]?.trim();
      modifications = {
        action: 'replace',
        details: { description: modText }
      };
    }

    if (response.includes('QUESTION:')) {
      const qText = response.split('QUESTION:')[1]?.split('\n')[0]?.trim();
      extractedQuestions.push(qText);
    }

    return NextResponse.json({
      message: response,
      modifications,
      questions: extractedQuestions
    });
  } catch (error) {
    console.error('Error:', error);
    return NextResponse.json({ error: 'Failed to process message' }, { status: 500 });
  }
}
