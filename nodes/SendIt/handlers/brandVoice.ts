import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, maybeArray, type ResourceHandler } from '../helpers';

export const handleBrandVoice: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'create') {
    const name = context.getNodeParameter('brandVoiceName', i) as string;
    const description = context.getNodeParameter('brandVoiceDescription', i) as string;
    const tone = context.getNodeParameter('brandVoiceTone', i) as string;
    const vocabulary = context.getNodeParameter('brandVoiceVocabulary', i) as string;
    const bannedWords = context.getNodeParameter('brandVoiceBannedWords', i) as string;
    const isDefault = context.getNodeParameter('brandVoiceIsDefault', i) as boolean;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/brand-voice',
        body: {
          name,
          description: description || undefined,
          tone: tone || undefined,
          vocabulary: maybeArray(vocabulary),
          bannedWords: maybeArray(bannedWords),
          isDefault,
        },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'list') {
    const limit = context.getNodeParameter('brandVoiceLimit', i) as number;
    const qs: Record<string, number> = { limit };

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/brand-voice',
        qs,
      },
      optionalHeaders,
    );
  }

  if (operation === 'get') {
    const id = context.getNodeParameter('brandVoiceId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/brand-voice/${id}`,
      },
      optionalHeaders,
    );
  }

  if (operation === 'update') {
    const id = context.getNodeParameter('brandVoiceId', i) as string;
    const name = context.getNodeParameter('brandVoiceName', i) as string;
    const description = context.getNodeParameter('brandVoiceDescription', i) as string;
    const tone = context.getNodeParameter('brandVoiceTone', i) as string;
    const vocabulary = context.getNodeParameter('brandVoiceVocabulary', i) as string;
    const bannedWords = context.getNodeParameter('brandVoiceBannedWords', i) as string;
    const isDefault = context.getNodeParameter('brandVoiceIsDefault', i) as boolean;

    return sendRequest(
      context,
      {
        method: 'PATCH' as IHttpRequestMethods,
        url: `/brand-voice/${id}`,
        body: {
          name: name || undefined,
          description: description || undefined,
          tone: tone || undefined,
          vocabulary: maybeArray(vocabulary),
          bannedWords: maybeArray(bannedWords),
          isDefault,
        },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'delete') {
    const id = context.getNodeParameter('brandVoiceId', i) as string;
    return sendRequest(
      context,
      {
        method: 'DELETE' as IHttpRequestMethods,
        url: `/brand-voice/${id}`,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
