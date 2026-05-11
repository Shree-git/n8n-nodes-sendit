import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, parseJsonInput, assertObject, type ResourceHandler } from '../helpers';

export const handleConnect: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'getConnectAction') {
    const platform = context.getNodeParameter('connectPlatform', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/connect/${platform}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'connectToken') {
    const platform = context.getNodeParameter('connectPlatform', i) as string;
    const credentialsJson = context.getNodeParameter('connectCredentialsJson', i) as string;
    const parsed = parseJsonInput(context, credentialsJson, 'Credentials JSON');
    const credentials = assertObject(parsed, 'Credentials JSON must parse to an object');

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/connect/token',
        body: { platform, credentials },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'connectWebhook') {
    const platform = context.getNodeParameter('connectPlatform', i) as string;
    const webhookUrl = context.getNodeParameter('connectWebhookUrl', i) as string;
    const metadataJson = context.getNodeParameter('connectMetadataJson', i) as string;
    const parsedMetadata = parseJsonInput(context, metadataJson, 'Metadata JSON');
    const metadata = parsedMetadata
      ? assertObject(parsedMetadata, 'Metadata JSON must parse to an object')
      : undefined;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/connect/webhook',
        body: { platform, webhookUrl, metadata },
        json: true,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
