import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, buildAiBody, type ResourceHandler } from '../helpers';

export const handleAi: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'generate') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const prompt = context.getNodeParameter('aiPrompt', i) as string;
    const aiOptions = context.getNodeParameter('aiOptions', i) as {
      hashtags?: string;
      tone?: string;
      style?: string;
      callToAction?: string;
      strictAi?: boolean;
    };

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/ai/generate-content',
        body: buildAiBody(platforms, mediaUrl, prompt, aiOptions),
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'replySuggestions') {
    const mentionId = context.getNodeParameter('aiMentionId', i) as string;
    const tone = context.getNodeParameter('aiTone', i) as string;
    const maxLength = context.getNodeParameter('aiMaxLength', i) as number;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/ai/reply-suggestions',
        body: {
          mentionId,
          tone: tone || undefined,
          maxLength: maxLength > 0 ? maxLength : undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'mentionSummary') {
    const since = context.getNodeParameter('aiSummarySince', i) as string;
    const platform = context.getNodeParameter('aiSummaryPlatform', i) as string;
    const keywordId = context.getNodeParameter('aiSummaryKeywordId', i) as string;
    const limit = context.getNodeParameter('aiSummaryLimit', i) as number;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/ai/mention-summary',
        body: {
          since: since || undefined,
          platform: platform || undefined,
          keywordId: keywordId || undefined,
          limit: limit > 0 ? limit : undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'feedback') {
    const logId = context.getNodeParameter('aiLogId', i) as string;
    const rating = context.getNodeParameter('aiRating', i) as number;
    const notes = context.getNodeParameter('aiNotes', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/ai/feedback',
        body: {
          logId,
          rating,
          notes: notes || undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
