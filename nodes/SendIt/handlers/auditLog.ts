import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleAuditLog: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    const action = context.getNodeParameter('auditAction', i) as string;
    const resourceType = context.getNodeParameter('auditResourceType', i) as string;
    const startDate = context.getNodeParameter('auditStartDate', i) as string;
    const endDate = context.getNodeParameter('auditEndDate', i) as string;
    const limit = context.getNodeParameter('auditLimit', i) as number;
    const offset = context.getNodeParameter('auditOffset', i) as number;

    const qs: Record<string, string | number> = { limit, offset };
    if (action) qs.action = action;
    if (resourceType) qs.resource_type = resourceType;
    if (startDate) qs.start_date = startDate;
    if (endDate) qs.end_date = endDate;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/audit-log',
        qs,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
