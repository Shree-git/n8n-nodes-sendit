import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, maybeArray, type ResourceHandler } from '../helpers';

export const handleValidation: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'validate') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const text = context.getNodeParameter('text', i) as string;
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const additionalOptions = context.getNodeParameter('additionalOptions', i) as {
      mediaUrls?: string;
      mediaType?: string;
    };

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/validate',
        body: {
          platforms,
          content: {
            text,
            mediaUrl: mediaUrl || undefined,
            mediaUrls: maybeArray(additionalOptions.mediaUrls),
            mediaType: additionalOptions.mediaType || 'auto',
          },
        },
        json: true,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
