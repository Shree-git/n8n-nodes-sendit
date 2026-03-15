import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, type ResourceHandler } from '../helpers';

export const handleMedia: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'upload') {
    const inputMode = context.getNodeParameter('mediaInputMode', i) as string;

    if (inputMode === 'binary') {
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
        optionalHeaders,
      );
    }

    const filePath = context.getNodeParameter('filePath', i) as string;
    const fs = await import('fs/promises');
    const path = await import('path');

    const resolved = path.resolve(filePath);
    try {
      await fs.access(resolved);
    } catch {
      throw new NodeOperationError(
        context.getNode(),
        `File not found: ${resolved}`,
      );
    }

    const fileBuffer = await fs.readFile(resolved);
    const fileName = path.basename(resolved);

    const formData = new FormData();
    formData.append('file', new Blob([fileBuffer]), fileName);

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/media/upload',
        body: formData,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
