import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleMedia: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'upload') {
    const binaryPropertyName = context.getNodeParameter('binaryPropertyName', i) as string;
    const binaryData = context.helpers.assertBinaryData(i, binaryPropertyName);
    const buffer = await context.helpers.getBinaryDataBuffer(i, binaryPropertyName);

    const formData = new FormData();
    formData.append('file', new Blob([buffer]), binaryData.fileName || 'upload');

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/media/upload',
        body: formData,
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
