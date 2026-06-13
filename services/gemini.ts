import { GoogleGenerativeAI } from '@google/generative-ai';

type ModelProvider = 'gemini' | 'nvidia';

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

const DEFAULT_NVIDIA_CHAT_MODEL = 'meta/llama-3.3-70b-instruct';
const DEFAULT_NVIDIA_CHAT_ENDPOINT = 'https://integrate.api.nvidia.com/v1/chat/completions';
const GEMINI_JSON_MODEL = 'gemini-2.5-flash-lite';

function hasNvidiaConfig() {
  return Boolean(process.env.NVIDIA_API_KEY || process.env.NVIDIA_KIMI_API_KEY);
}

function hasGeminiConfig() {
  return Boolean(process.env.GEMINI_API_KEY);
}

function formatProviderError(provider: ModelProvider, error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return `${provider}: ${message}`;
}

function getNvidiaConfig() {
  const apiKey = process.env.NVIDIA_API_KEY || process.env.NVIDIA_KIMI_API_KEY;

  if (!apiKey) {
    throw new Error('NVIDIA_API_KEY or NVIDIA_KIMI_API_KEY is not configured');
  }

  return {
    apiKey,
    endpoint: process.env.NVIDIA_API_URL || DEFAULT_NVIDIA_CHAT_ENDPOINT,
    model: process.env.NVIDIA_MODEL || DEFAULT_NVIDIA_CHAT_MODEL,
  };
}

function getGeminiConfig() {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  return { apiKey, model: GEMINI_JSON_MODEL };
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
  maxTokens = 3000,
  timeoutMs = 18_000
): Promise<string> {
  const { apiKey, endpoint, model } = getNvidiaConfig();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        top_p: 0.8,
        max_tokens: maxTokens,
        ...(jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
    });
    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      const detail = errorText ? `: ${errorText}` : '';
      throw new Error(
        `NVIDIA request failed with status ${response.status} for model ${model} at ${endpoint}${detail}`
      );
    }

    const data = (await response.json()) as NvidiaChatCompletionResponse;
    const text = extractContent(data.choices?.[0]?.message?.content);

    if (!text) {
      throw new Error(`NVIDIA model ${model} returned an empty response`);
    }

    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`NVIDIA request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiText(
  prompt: string,
  maxTokens = 3000,
  timeoutMs = 12_000,
  temperature = 0.4
): Promise<string> {
  const { apiKey, model } = getGeminiConfig();
  const client = new GoogleGenerativeAI(apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const generativeModel = client.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        topP: 0.8,
        maxOutputTokens: maxTokens,
      },
    });

    const response = await generativeModel.generateContent(prompt, {
      signal: controller.signal,
      timeout: timeoutMs,
      apiVersion: 'v1beta',
    });

    const text = response.response.text().trim();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Gemini request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function callGeminiJson(
  prompt: string,
  maxTokens = 3000,
  timeoutMs = 12_000,
  responseSchema?: Record<string, unknown>,
  temperature = 0
): Promise<string> {
  const { apiKey, model } = getGeminiConfig();
  const client = new GoogleGenerativeAI(apiKey);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const generativeModel = client.getGenerativeModel({
      model,
      generationConfig: {
        temperature,
        topP: 0.8,
        maxOutputTokens: maxTokens,
        responseMimeType: 'application/json',
        ...(responseSchema ? { responseSchema: responseSchema as never } : {}),
      },
    });

    const response = await generativeModel.generateContent(prompt, {
      signal: controller.signal,
      timeout: timeoutMs,
      apiVersion: 'v1beta',
    });

    const text = response.response.text().trim();

    if (!text) {
      throw new Error('Gemini returned an empty response');
    }

    return text;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(`Gemini request timed out after ${Math.round(timeoutMs / 1000)}s`);
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateJson<T>(
  prompt: string,
  options?: {
    maxTokens?: number;
    repairMaxTokens?: number;
    skipRepair?: boolean;
    timeoutMs?: number;
    responseSchema?: Record<string, unknown>;
    temperature?: number;
  }
): Promise<T> {
  const maxTokens = options?.maxTokens ?? 3000;
  const repairMaxTokens = options?.repairMaxTokens ?? Math.max(900, Math.floor(maxTokens / 2));
  const skipRepair = options?.skipRepair ?? false;
  const timeoutMs = options?.timeoutMs ?? 18_000;
  const temperature = options?.temperature ?? 0;
  const repairPrompt = (payload: string) =>
    `Fix the following JSON so it is valid. Preserve the structure and data exactly. Return only valid JSON with no markdown.\n\n${payload}`;
  const messages: NvidiaChatMessage[] = [
    {
      role: 'user',
      content: `${prompt}\n\nReturn valid JSON only. Do not wrap the response in markdown.`,
    },
  ];

  const geminiPrompt = `${prompt}\n\nReturn valid JSON only. Do not wrap the response in markdown.`;
  let text: string | null = null;
  let sourceProvider: ModelProvider | null = null;
  const generationErrors: string[] = [];

  if (hasGeminiConfig()) {
    try {
      text = await callGeminiJson(
        geminiPrompt,
        maxTokens,
        Math.min(timeoutMs, 45_000),
        options?.responseSchema,
        temperature
      );
      sourceProvider = 'gemini';
    } catch (error) {
      generationErrors.push(formatProviderError('gemini', error));
      console.warn('[gemini] Gemini JSON generation failed, evaluating fallbacks', error);
    }
  }

  if (!sourceProvider && hasNvidiaConfig()) {
    try {
      // Cap the NVIDIA fallback independently so a long Gemini timeout budget
      // doesn't make users wait tens of seconds on the secondary provider.
      text = await callNvidia(messages, temperature, true, maxTokens, Math.min(timeoutMs, 20_000));
      sourceProvider = 'nvidia';
    } catch (error) {
      generationErrors.push(formatProviderError('nvidia', error));
    }
  }

  if (!sourceProvider) {
    throw new Error(
      `No AI provider could generate JSON. ${generationErrors.length ? generationErrors.join(' | ') : 'No providers are configured.'}`
    );
  }

  if (!text) {
    throw new Error(`Provider ${sourceProvider} did not return a response body`);
  }

  try {
    return JSON.parse(extractLikelyJson(text)) as T;
  } catch (primaryError) {
    if (skipRepair) {
      throw new Error(
        `${sourceProvider} returned invalid JSON. Parse error: ${primaryError instanceof Error ? primaryError.message : 'unknown'}`
      );
    }

    const repairErrors: string[] = [];
    const repairTimeoutMs = Math.max(15_000, Math.floor(repairMaxTokens * 8));

    if (hasGeminiConfig()) {
      try {
        const repairText = await callGeminiJson(
          repairPrompt(text),
          repairMaxTokens,
          Math.min(repairTimeoutMs, 20_000),
          options?.responseSchema
        );

        return JSON.parse(extractLikelyJson(repairText)) as T;
      } catch (error) {
        repairErrors.push(formatProviderError('gemini', error));
      }
    }

    if (hasNvidiaConfig()) {
      try {
        const repairText = await callNvidia(
          [{ role: 'user', content: repairPrompt(text) }],
          0,
          true,
          repairMaxTokens,
          repairTimeoutMs
        );

        return JSON.parse(extractLikelyJson(repairText)) as T;
      } catch (error) {
        repairErrors.push(formatProviderError('nvidia', error));
      }
    }

    throw new Error(
      `Unable to repair invalid JSON from ${sourceProvider}. First parse error: ${primaryError instanceof Error ? primaryError.message : 'unknown'}. Repair attempts failed: ${repairErrors.join(' | ') || 'no repair providers available'}`
    );
  }
}

export async function generateText(prompt: string): Promise<string> {
  const errors: string[] = [];

  if (hasNvidiaConfig()) {
    try {
      return await callNvidia([{ role: 'user', content: prompt }], 0.4);
    } catch (error) {
      errors.push(formatProviderError('nvidia', error));
      console.warn('[gemini] NVIDIA text generation failed, evaluating Gemini fallback', error);
    }
  }

  if (hasGeminiConfig()) {
    try {
      return await callGeminiText(prompt);
    } catch (error) {
      errors.push(formatProviderError('gemini', error));
    }
  }

  throw new Error(`No AI provider could generate text. ${errors.join(' | ') || 'No providers are configured.'}`);
}
