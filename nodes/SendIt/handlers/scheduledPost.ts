import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleScheduledPost: ResourceHandler = async (
  context,
  operation,
  i,
  optionalHeaders
) => {
  if (operation === 'create') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const text = context.getNodeParameter('text', i) as string;
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const scheduledTime = context.getNodeParameter('scheduledTime', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/schedule',
        body: {
          platforms,
          content: {
            text,
            mediaUrl: mediaUrl || undefined,
          },
          scheduledTime,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'getAll') {
    const platformFilter = context.getNodeParameter('platformFilter', i) as string;
    const qs: Record<string, string> = {};
    if (platformFilter) {
      qs.platform = platformFilter;
    }

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/scheduled',
        qs,
      },
      optionalHeaders
    );
  }

  if (operation === 'delete') {
    const scheduleId = context.getNodeParameter('scheduleId', i) as string;

    return sendRequest(
      context,
      {
        method: 'DELETE' as IHttpRequestMethods,
        url: `/scheduled/${scheduleId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'trigger') {
    const scheduleId = context.getNodeParameter('scheduleId', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/scheduled/${scheduleId}/trigger`,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
