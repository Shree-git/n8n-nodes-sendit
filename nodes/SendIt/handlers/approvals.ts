import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleApprovals: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    const limit = context.getNodeParameter('approvalLimit', i) as number;
    const offset = context.getNodeParameter('approvalOffset', i) as number;
    const qs: Record<string, number> = { limit, offset };

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/approvals',
        qs,
      },
      optionalHeaders,
    );
  }

  if (operation === 'approve') {
    const postId = context.getNodeParameter('approvalPostId', i) as string;
    const comment = context.getNodeParameter('approvalComment', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/approvals/${postId}/approve`,
        body: { comment: comment || undefined },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'reject') {
    const postId = context.getNodeParameter('approvalPostId', i) as string;
    const reason = context.getNodeParameter('approvalReason', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: `/approvals/${postId}/reject`,
        body: { reason },
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
