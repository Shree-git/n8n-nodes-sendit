import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleInbox: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    const platformFilter = context.getNodeParameter('inboxPlatformFilter', i) as string;
    const statusFilter = context.getNodeParameter('inboxStatusFilter', i) as string;
    const limit = context.getNodeParameter('inboxLimit', i) as number;
    const qs: Record<string, string | number> = { limit };

    if (platformFilter) {
      qs.platform = platformFilter;
    }
    if (statusFilter) {
      qs.status = statusFilter;
    }

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/inbox',
        qs,
      },
      optionalHeaders,
    );
  }

  if (operation === 'reply') {
    const threadId = context.getNodeParameter('inboxThreadId', i) as string;
    const message = context.getNodeParameter('inboxMessage', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/inbox/${threadId}/reply`,
        body: { text: message },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'getThread') {
    const threadId = context.getNodeParameter('inboxThreadId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/inbox/${threadId}`,
      },
      optionalHeaders,
    );
  }

  if (operation === 'updateStatus') {
    const threadId = context.getNodeParameter('inboxThreadId', i) as string;
    const status = context.getNodeParameter('inboxThreadStatus', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/inbox/${threadId}/status`,
        body: { status },
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
