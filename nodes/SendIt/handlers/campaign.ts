import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleCampaign: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'plan') {
    const objective = context.getNodeParameter('campaignObjective', i) as string;
    const platforms = context.getNodeParameter('campaignPlatforms', i) as string[];
    const brief = context.getNodeParameter('campaignBrief', i) as string;
    const postCount = context.getNodeParameter('campaignPostCount', i) as number;
    const startDate = context.getNodeParameter('campaignStartDate', i) as string;
    const endDate = context.getNodeParameter('campaignEndDate', i) as string;

    const normalizedBrief = brief || objective;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/campaigns',
        body: {
          brief: normalizedBrief,
          platforms,
          postCount: Number.isFinite(postCount) ? postCount : undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'list') {
    const limit = context.getNodeParameter('campaignLimit', i) as number;
    const offset = context.getNodeParameter('campaignOffset', i) as number;
    const qs: Record<string, number> = { limit, offset };

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/campaigns',
        qs,
      },
      optionalHeaders
    );
  }

  if (operation === 'schedule') {
    const campaignId = context.getNodeParameter('campaignId', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/campaigns/${campaignId}/schedule`,
        json: true,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
