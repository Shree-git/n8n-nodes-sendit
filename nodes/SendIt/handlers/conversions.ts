import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, parseJsonInput, type ResourceHandler } from '../helpers';

export const handleConversions: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'track') {
    const trackedLinkId = context.getNodeParameter('conversionTrackedLinkId', i) as string;
    const shortCode = context.getNodeParameter('conversionShortCode', i) as string;
    const conversionType = context.getNodeParameter('conversionType', i) as string;
    const value = context.getNodeParameter('conversionValue', i) as number;
    const metadataJson = context.getNodeParameter('conversionMetadataJson', i) as string;
    const metadata = parseJsonInput(context, metadataJson, 'Conversion Metadata JSON');

    const body: Record<string, unknown> = {};
    if (trackedLinkId) body.trackedLinkId = trackedLinkId;
    if (shortCode) body.shortCode = shortCode;
    if (conversionType) body.conversionType = conversionType;
    if (value > 0) body.value = value;
    if (metadata) body.metadata = metadata;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/conversions',
        body,
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
