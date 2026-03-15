import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleAccount: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'getAll') {
    const limit = context.getNodeParameter('accountLimit', i) as number;
    const qs: Record<string, number> = { limit };

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/accounts',
        qs,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
