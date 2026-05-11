import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleBulkSchedule: ResourceHandler = async (
  context,
  operation,
  i,
  optionalHeaders
) => {
  if (operation === 'listImports') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/bulk-schedule',
      },
      optionalHeaders
    );
  }

  if (operation === 'getImport') {
    const importId = context.getNodeParameter('bulkImportId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/bulk-schedule/${importId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'validateCsv') {
    const csvContent = context.getNodeParameter('bulkCsvContent', i) as string;
    const filename = context.getNodeParameter('bulkFilename', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/bulk-schedule/validate',
        body: { csvContent, filename },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'importCsv') {
    const csvContent = context.getNodeParameter('bulkCsvContent', i) as string;
    const filename = context.getNodeParameter('bulkFilename', i) as string;
    const skipErrors = context.getNodeParameter('bulkSkipErrors', i) as boolean;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/bulk-schedule/import',
        body: { csvContent, filename, skipErrors },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'downloadTemplate') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/bulk-schedule/template',
        json: false,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
