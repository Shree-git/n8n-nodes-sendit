import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, maybeArray, type ResourceHandler } from '../helpers';

export const handleContentScore: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'score') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const text = context.getNodeParameter('text', i) as string;
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const scoreMediaUrls = context.getNodeParameter('scoreMediaUrls', i) as string;
    const scoreScheduledTime = context.getNodeParameter('scoreScheduledTime', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/content-score',
        body: {
          platforms,
          text,
          mediaUrl: mediaUrl || undefined,
          mediaUrls: maybeArray(scoreMediaUrls),
          scheduledTime: scoreScheduledTime || undefined,
        },
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
