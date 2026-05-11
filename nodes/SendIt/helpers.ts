import {
  IExecuteFunctions,
  IHttpRequestMethods,
  IHttpRequestOptions,
  IDataObject,
  JsonObject,
  NodeApiError,
  NodeOperationError,
} from 'n8n-workflow';

import { SENDIT_API_BASE_URL } from './constants';

export function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildOptionalHeaders(
  teamId?: string,
  idempotencyKey?: string
): Record<string, string> {
  const headers: Record<string, string> = {};
  if (teamId) {
    headers['X-Team-ID'] = teamId;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

export function parseCsvList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : undefined;
}

export function maybeArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === 'string') {
    return parseCsvList(value);
  }

  return undefined;
}

export function parseJsonInput(
  context: IExecuteFunctions,
  value: string | undefined,
  label: string
): unknown {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new NodeOperationError(context.getNode(), `${label} must be valid JSON`);
  }
}

export function normalizeResponse(response: unknown): IDataObject {
  if (response === null || response === undefined) {
    return {};
  }

  if (Buffer.isBuffer(response)) {
    return {
      dataBase64: response.toString('base64'),
      byteLength: response.length,
    };
  }

  if (typeof response === 'string') {
    return { data: response };
  }

  if (typeof response !== 'object') {
    return { data: response as string | number | boolean };
  }

  if (Array.isArray(response)) {
    return { items: response } as unknown as IDataObject;
  }

  return response as IDataObject;
}

export async function sendRequest(
  context: IExecuteFunctions,
  request: { method: IHttpRequestMethods; url: string; [key: string]: unknown },
  optionalHeaders: Record<string, string>,
  baseURL: string = SENDIT_API_BASE_URL
): Promise<unknown> {
  const requestHeaders = (request.headers as Record<string, string> | undefined) ?? {};
  const headers = {
    ...requestHeaders,
    ...optionalHeaders,
  };

  try {
    return await context.helpers.httpRequestWithAuthentication.call(context, 'sendItApi', {
      baseURL,
      ...request,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    } as unknown as IHttpRequestOptions);
  } catch (error: unknown) {
    const err = error as {
      httpCode?: number;
      statusCode?: number;
      message?: string;
      description?: string;
    };
    const statusCode = err.httpCode ?? err.statusCode;

    if (statusCode === 401) {
      throw new NodeOperationError(
        context.getNode(),
        'API key is invalid or expired. Check your SendIt API credentials in n8n.',
        { description: err.message }
      );
    }

    if (statusCode === 429) {
      throw new NodeOperationError(
        context.getNode(),
        'Rate limit exceeded. Wait and retry, or reduce request frequency.',
        { description: 'SendIt API allows 50 requests per minute per API key.' }
      );
    }

    if (statusCode === 400) {
      const detail = err.description || err.message || 'Bad request';
      throw new NodeOperationError(context.getNode(), `Bad request: ${detail}`, {
        description: `The API rejected the request to ${request.method} ${request.url}. Check your parameters.`,
      });
    }

    throw new NodeApiError(context.getNode(), error as JsonObject);
  }
}

export function assertObject(
  context: IExecuteFunctions,
  value: unknown,
  message: string
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new NodeOperationError(context.getNode(), message);
  }
  return value as Record<string, unknown>;
}

export interface AiOptions {
  hashtags?: string;
  tone?: string;
  style?: string;
  callToAction?: string;
  strictAi?: boolean;
  facebookMode?: string;
  youtubeMode?: string;
}

export function buildAiBody(
  platforms: string[],
  mediaUrl: string,
  prompt: string,
  aiOptions: AiOptions
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    platforms,
    mediaUrl: mediaUrl || undefined,
    prompt: prompt || undefined,
    hashtags: aiOptions.hashtags || 'platform_auto',
    strictAi: aiOptions.strictAi || false,
  };

  if (aiOptions.facebookMode) {
    body.facebookMode = aiOptions.facebookMode;
  }
  if (aiOptions.youtubeMode) {
    body.youtubeMode = aiOptions.youtubeMode;
  }

  if (aiOptions.tone || aiOptions.style || aiOptions.callToAction) {
    body.generation = {
      tone: aiOptions.tone,
      style: aiOptions.style,
      callToAction: aiOptions.callToAction,
    };
  }

  return body;
}

export function buildLibraryBody(params: {
  title: string;
  text: string;
  libraryType: string;
  category: string;
  tags: string;
  targetPlatforms: string[];
  evergreenEnabled: boolean;
  evergreenIntervalDays: number;
  evergreenMaxPublishes: number;
}): Record<string, unknown> {
  return {
    title: params.title,
    text: params.text,
    type: params.libraryType,
    category: params.category || undefined,
    tags: maybeArray(params.tags),
    targetPlatforms: params.targetPlatforms.length > 0 ? params.targetPlatforms : undefined,
    evergreenEnabled: params.evergreenEnabled,
    evergreenIntervalDays:
      params.evergreenIntervalDays > 0 ? params.evergreenIntervalDays : undefined,
    evergreenMaxPublishes:
      params.evergreenMaxPublishes > 0 ? params.evergreenMaxPublishes : undefined,
  };
}

export type ResourceHandler = (
  context: IExecuteFunctions,
  operation: string,
  itemIndex: number,
  optionalHeaders: Record<string, string>
) => Promise<unknown>;
