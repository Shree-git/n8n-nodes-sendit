import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { SENDIT_API_ORIGIN } from '../constants';
import {
  sendRequest,
  getOptionalString,
  parseJsonInput,
  assertObject,
  type ResourceHandler,
} from '../helpers';

export const handleAdvanced: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'apiRequest') {
    const method = context.getNodeParameter('advancedMethod', i) as IHttpRequestMethods;
    const path = context.getNodeParameter('advancedPath', i) as string;
    const queryJson = context.getNodeParameter('advancedQueryJson', i) as string;
    const bodyJson = context.getNodeParameter('advancedBodyJson', i) as string;
    const responseMode = context.getNodeParameter('advancedResponseMode', i) as string;
    const requestTimeoutMs = context.getNodeParameter('requestTimeoutMs', i) as number;

    const normalizedPath = getOptionalString(path);
    if (!normalizedPath) {
      throw new NodeOperationError(context.getNode(), 'Path is required for advanced API request');
    }

    if (!/^\/api\/v[12]\//.test(normalizedPath)) {
      throw new NodeOperationError(
        context.getNode(),
        'Advanced path must start with /api/v1/ or /api/v2/'
      );
    }

    const parsedQuery = parseJsonInput(context, queryJson, 'Query JSON');
    const parsedBody = parseJsonInput(context, bodyJson, 'Body JSON');
    const qs = parsedQuery
      ? assertObject(parsedQuery, 'Query JSON must parse to an object')
      : undefined;
    const body = parsedBody === undefined ? undefined : parsedBody;

    return sendRequest(
      context,
      {
        method,
        url: normalizedPath,
        qs,
        body,
        json: responseMode === 'json',
        encoding: responseMode === 'binary' ? null : undefined,
        timeout: requestTimeoutMs > 0 ? requestTimeoutMs : undefined,
      },
      optionalHeaders,
      SENDIT_API_ORIGIN
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
