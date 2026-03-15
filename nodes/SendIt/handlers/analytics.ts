import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleAnalytics: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'getAnalytics') {
    const platform = context.getNodeParameter('analyticsPlatform', i) as string;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/analytics',
        qs: { platform },
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
