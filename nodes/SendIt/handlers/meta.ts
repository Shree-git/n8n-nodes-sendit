import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleMeta: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'getCapabilities') {
    return sendRequest(
      context,
      { method: 'GET' as IHttpRequestMethods, url: '/capabilities' },
      optionalHeaders
    );
  }

  if (operation === 'getRequirements') {
    const platform = context.getNodeParameter('metaPlatform', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/requirements',
        qs: { platform },
      },
      optionalHeaders
    );
  }

  if (operation === 'getPlatformSettingsSchema') {
    const platform = context.getNodeParameter('metaPlatform', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/platforms/schema',
        qs: { platform },
      },
      optionalHeaders
    );
  }

  if (operation === 'getBestTimes') {
    const platform = context.getNodeParameter('metaPlatform', i) as string;
    const limit = context.getNodeParameter('metaBestTimesLimit', i) as number;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/best-times',
        qs: { platform, limit },
      },
      optionalHeaders
    );
  }

  if (operation === 'getWebhookEventsCatalog') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/webhooks/events-catalog',
      },
      optionalHeaders
    );
  }

  if (operation === 'getWebhookTriggers') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/webhooks/triggers',
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
