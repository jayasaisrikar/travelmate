type NvidiaChatRole = 'user' | 'assistant' | 'system';

interface NvidiaChatMessage {
  role: NvidiaChatRole;
  content: string;
}

interface NvidiaChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | Array<{ text?: string }>;
    };
  }>;
}

const NVIDIA_CHAT_MODEL = 'moonshotai/kimi-k2.5';

function getNvidiaConfig() {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_KIMI_API_KEY;

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY or NVIDIA_KIMI_API_KEY is not configured');
  }

  return { apiKey, model: NVIDIA_CHAT_MODEL };
}

function cleanJsonPayload(text: string): string {
  return text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
}

function extractLikelyJson(text: string): string {
  const trimmed = cleanJsonPayload(text);
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');

  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

function extractContent(content: string | Array<{ text?: string }> | undefined): string {
  if (typeof content === 'string') {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content.map(part => part.text || '').join('').trim();
  }

  return '';
}

async function callNvidia(
  messages: NvidiaChatMessage[],
  temperature: number,
  jsonMode = false,
  maxTokens = 3000
): Promise<string> {
  const { apiKey, model } = getNvidiaConfig();
  const response = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      top_p: 0.8,
      max_tokens: maxTokens,
      ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      chat_template_kwargs: { thinking: false },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`NVIDIA request failed with status ${response.status}${errorText ? `: ${errorText}` : ''}`);
  }

  const data = (await response.json()) as NvidiaChatCompletionResponse;
  const text = extractContent(data.choices?.[0]?.message?.content);

  if (!text) {
    throw new Error('Kimi 2.5 returned an empty response');
  }

  return text;
}

export async function generateJson<T>(
  prompt: string,
  options?: {
    maxTokens?: number;
    repairMaxTokens?: number;
  }
): Promise<T> {
  const maxTokens = options?.maxTokens ?? 3000;
  const repairMaxTokens = options?.repairMaxTokens ?? Math.max(1500, Math.floor(maxTokens / 2));
  const messages: NvidiaChatMessage[] = [
    {
      role: 'user',
      content: `${prompt}\n\nReturn valid JSON only. Do not wrap the response in markdown.`,
    },
  ];

  const text = await callNvidia(messages, 0.2, true, maxTokens);

  try {
    return JSON.parse(extractLikelyJson(text)) as T;
  } catch (primaryError) {
    const repairText = await callNvidia(
      [
        {
          role: 'user',
          content: `Fix the following JSON so it is valid. Preserve the structure and data exactly. Return only valid JSON with no markdown.\n\n${text}`,
        },
      ],
      0,
      true,
      repairMaxTokens
    );

    try {
      return JSON.parse(extractLikelyJson(repairText)) as T;
    } catch (repairError) {
      throw new Error(
        `Kimi 2.5 returned invalid JSON. First parse error: ${primaryError instanceof Error ? primaryError.message : 'unknown'}. Repair parse error: ${repairError instanceof Error ? repairError.message : 'unknown'}`
      );
    }
  }
}

export async function generateText(prompt: string): Promise<string> {
  return callNvidia([{ role: 'user', content: prompt }], 0.4);
}
