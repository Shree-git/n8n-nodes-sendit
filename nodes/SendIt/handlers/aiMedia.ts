import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleAiMedia: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'create') {
    const provider = context.getNodeParameter('aiMediaProvider', i) as string;
    const prompt = context.getNodeParameter('aiMediaPrompt', i) as string;
    const mediaType = context.getNodeParameter('aiMediaType', i) as string;
    const stylePreset = context.getNodeParameter('aiMediaStylePreset', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/ai-media',
        body: {
          provider,
          prompt,
          media_type: mediaType,
          parameters: stylePreset ? { stylePreset } : {},
        },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'getStatus') {
    const jobId = context.getNodeParameter('aiMediaJobId', i) as string;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/ai-media/${jobId}`,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
