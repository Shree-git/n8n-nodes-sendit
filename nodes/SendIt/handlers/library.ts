import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, buildLibraryBody, type ResourceHandler } from '../helpers';

export const handleLibrary: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'list') {
    const libraryType = context.getNodeParameter('libraryType', i) as string;
    const category = context.getNodeParameter('libraryCategory', i) as string;
    const tags = context.getNodeParameter('libraryTags', i) as string;
    const targetPlatforms = context.getNodeParameter('libraryTargetPlatforms', i) as string[];
    const search = context.getNodeParameter('librarySearch', i) as string;
    const limit = context.getNodeParameter('libraryLimit', i) as number;
    const offset = context.getNodeParameter('libraryOffset', i) as number;

    const qs: Record<string, string | number> = { limit, offset };
    if (libraryType) qs.type = libraryType;
    if (category) qs.category = category;
    if (tags) qs.tags = tags;
    if (targetPlatforms.length > 0) qs.platform = targetPlatforms[0];
    if (search) qs.search = search;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/library',
        qs,
      },
      optionalHeaders,
    );
  }

  if (operation === 'create') {
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/library',
        body: buildLibraryBody({
          title: context.getNodeParameter('libraryTitle', i) as string,
          text: context.getNodeParameter('libraryText', i) as string,
          libraryType: context.getNodeParameter('libraryType', i) as string,
          category: context.getNodeParameter('libraryCategory', i) as string,
          tags: context.getNodeParameter('libraryTags', i) as string,
          targetPlatforms: context.getNodeParameter('libraryTargetPlatforms', i) as string[],
          evergreenEnabled: context.getNodeParameter('libraryEvergreenEnabled', i) as boolean,
          evergreenIntervalDays: context.getNodeParameter('libraryEvergreenIntervalDays', i) as number,
          evergreenMaxPublishes: context.getNodeParameter('libraryEvergreenMaxPublishes', i) as number,
        }),
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'get') {
    const itemId = context.getNodeParameter('libraryItemId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/library/${itemId}`,
      },
      optionalHeaders,
    );
  }

  if (operation === 'update') {
    const itemId = context.getNodeParameter('libraryItemId', i) as string;
    return sendRequest(
      context,
      {
        method: 'PATCH' as IHttpRequestMethods,
        url: `/library/${itemId}`,
        body: buildLibraryBody({
          title: context.getNodeParameter('libraryTitle', i) as string,
          text: context.getNodeParameter('libraryText', i) as string,
          libraryType: context.getNodeParameter('libraryType', i) as string,
          category: context.getNodeParameter('libraryCategory', i) as string,
          tags: context.getNodeParameter('libraryTags', i) as string,
          targetPlatforms: context.getNodeParameter('libraryTargetPlatforms', i) as string[],
          evergreenEnabled: context.getNodeParameter('libraryEvergreenEnabled', i) as boolean,
          evergreenIntervalDays: context.getNodeParameter('libraryEvergreenIntervalDays', i) as number,
          evergreenMaxPublishes: context.getNodeParameter('libraryEvergreenMaxPublishes', i) as number,
        }),
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'delete') {
    const itemId = context.getNodeParameter('libraryItemId', i) as string;
    return sendRequest(
      context,
      {
        method: 'DELETE' as IHttpRequestMethods,
        url: `/library/${itemId}`,
      },
      optionalHeaders,
    );
  }

  if (operation === 'listCategories') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/library/categories',
      },
      optionalHeaders,
    );
  }

  if (operation === 'listTags') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/library/tags',
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
