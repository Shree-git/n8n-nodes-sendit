import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleWebhooks: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/webhooks',
      },
      optionalHeaders
    );
  }

  if (operation === 'get') {
    const webhookId = context.getNodeParameter('webhookId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/webhooks/${webhookId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'update') {
    const webhookId = context.getNodeParameter('webhookId', i) as string;
    const url = context.getNodeParameter('webhookUpdateUrl', i) as string;
    const eventsRaw = context.getNodeParameter('webhookUpdateEvents', i) as string;
    const active = context.getNodeParameter('webhookUpdateActive', i) as boolean;

    const body: Record<string, unknown> = { active };
    if (url) body.url = url;
    if (eventsRaw) {
      const events = eventsRaw
        .split(',')
        .map((e) => e.trim())
        .filter((e) => e.length > 0);
      if (events.length > 0) body.events = events;
    }

    return sendRequest(
      context,
      {
        method: 'PATCH' as IHttpRequestMethods,
        url: `/webhooks/${webhookId}`,
        body,
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'testWebhook') {
    const webhookId = context.getNodeParameter('webhookId', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/webhooks/${webhookId}/test`,
        json: true,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
