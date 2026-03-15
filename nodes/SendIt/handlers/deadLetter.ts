import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleDeadLetter: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    const status = context.getNodeParameter('deadLetterStatus', i) as string;
    const limit = context.getNodeParameter('deadLetterLimit', i) as number;

    const qs: Record<string, string | number> = { limit };
    if (status) qs.status = status;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/dead-letter',
        qs,
      },
      optionalHeaders,
    );
  }

  if (operation === 'requeue') {
    const id = context.getNodeParameter('deadLetterId', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/dead-letter/${id}/requeue`,
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'discard') {
    const id = context.getNodeParameter('deadLetterId', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/dead-letter/${id}/discard`,
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
