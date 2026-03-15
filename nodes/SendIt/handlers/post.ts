import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, maybeArray, buildAiBody, type ResourceHandler } from '../helpers';

export const handlePost: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'publish') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const text = context.getNodeParameter('text', i) as string;
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const additionalOptions = context.getNodeParameter('additionalOptions', i) as {
      mediaUrls?: string;
      mediaType?: string;
      facebookMode?: string;
      youtubeMode?: string;
      pinterestBoardId?: string;
    };

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/publish',
        body: {
          platforms,
          content: {
            text,
            mediaUrl: mediaUrl || undefined,
            mediaUrls: maybeArray(additionalOptions.mediaUrls),
            mediaType: additionalOptions.mediaType || 'auto',
            facebookMode: additionalOptions.facebookMode,
            youtubeMode: additionalOptions.youtubeMode,
            pinterestBoardId: additionalOptions.pinterestBoardId,
          },
        },
        json: true,
      },
      optionalHeaders,
    );
  }

  if (operation === 'publishAi') {
    const platforms = context.getNodeParameter('platforms', i) as string[];
    const mediaUrl = context.getNodeParameter('mediaUrl', i) as string;
    const prompt = context.getNodeParameter('aiPrompt', i) as string;
    const aiOptions = context.getNodeParameter('aiOptions', i) as {
      hashtags?: string;
      tone?: string;
      style?: string;
      callToAction?: string;
      strictAi?: boolean;
      facebookMode?: string;
      youtubeMode?: string;
    };

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/publish-ai',
        body: buildAiBody(platforms, mediaUrl, prompt, aiOptions),
        json: true,
      },
      optionalHeaders,
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
