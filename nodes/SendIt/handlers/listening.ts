import { IHttpRequestMethods, NodeOperationError } from 'n8n-workflow';
import { sendRequest, maybeArray, type ResourceHandler } from '../helpers';

export const handleListening: ResourceHandler = async (context, operation, i, optionalHeaders) => {
  if (operation === 'refresh') {
    const platforms = context.getNodeParameter('listeningPlatforms', i) as string[];
    const keywordIdsRaw = context.getNodeParameter('listeningKeywordIds', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/refresh',
        body: {
          platforms,
          keywordIds: maybeArray(keywordIdsRaw),
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'listKeywords') {
    const activeOnly = context.getNodeParameter('listeningActiveOnly', i) as boolean;
    const keywordType = context.getNodeParameter('listeningKeywordType', i) as string;
    const qs: Record<string, string> = {
      active: activeOnly ? 'true' : 'false',
    };
    if (keywordType) {
      qs.type = keywordType;
    }

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/listening/keywords',
        qs,
      },
      optionalHeaders
    );
  }

  if (operation === 'createKeyword') {
    const keyword = context.getNodeParameter('listeningKeyword', i) as string;
    const type = context.getNodeParameter('listeningKeywordType', i) as string;
    const platforms = context.getNodeParameter('listeningPlatforms', i) as string[];
    const notifyEmail = context.getNodeParameter('listeningNotifyEmail', i) as boolean;
    const notifyWebhook = context.getNodeParameter('listeningNotifyWebhook', i) as boolean;
    const webhookUrl = context.getNodeParameter('listeningWebhookUrl', i) as string;
    const sentimentFilter = context.getNodeParameter('listeningSentimentFilter', i) as string;

    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/keywords',
        body: {
          keyword,
          type,
          platforms: platforms.length > 0 ? platforms : undefined,
          notifyEmail,
          notifyWebhook,
          webhookUrl: webhookUrl || undefined,
          sentimentFilter: sentimentFilter || undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'getKeyword') {
    const keywordId = context.getNodeParameter('listeningKeywordId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/listening/keywords/${keywordId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'updateKeyword') {
    const keywordId = context.getNodeParameter('listeningKeywordId', i) as string;
    const type = context.getNodeParameter('listeningKeywordType', i) as string;
    const platforms = context.getNodeParameter('listeningPlatforms', i) as string[];
    const notifyEmail = context.getNodeParameter('listeningNotifyEmail', i) as boolean;
    const notifyWebhook = context.getNodeParameter('listeningNotifyWebhook', i) as boolean;
    const webhookUrl = context.getNodeParameter('listeningWebhookUrl', i) as string;
    const sentimentFilter = context.getNodeParameter('listeningSentimentFilter', i) as string;

    return sendRequest(
      context,
      {
        method: 'PATCH' as IHttpRequestMethods,
        url: `/listening/keywords/${keywordId}`,
        body: {
          type,
          platforms: platforms.length > 0 ? platforms : undefined,
          notifyEmail,
          notifyWebhook,
          webhookUrl: webhookUrl || undefined,
          sentimentFilter: sentimentFilter || undefined,
        },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'deleteKeyword') {
    const keywordId = context.getNodeParameter('listeningKeywordId', i) as string;
    return sendRequest(
      context,
      {
        method: 'DELETE' as IHttpRequestMethods,
        url: `/listening/keywords/${keywordId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'listMentions') {
    const keywordId = context.getNodeParameter('listeningMentionKeywordId', i) as string;
    const platform = context.getNodeParameter('listeningMentionPlatform', i) as string;
    const sentiment = context.getNodeParameter('listeningSentimentFilter', i) as string;
    const isRead = context.getNodeParameter('listeningIsRead', i) as string;
    const isArchived = context.getNodeParameter('listeningIsArchived', i) as string;
    const since = context.getNodeParameter('listeningSince', i) as string;
    const limit = context.getNodeParameter('listeningLimit', i) as number;
    const offset = context.getNodeParameter('listeningOffset', i) as number;

    const qs: Record<string, string | number> = { limit, offset };
    if (keywordId) qs.keyword_id = keywordId;
    if (platform) qs.platform = platform;
    if (sentiment) qs.sentiment = sentiment;
    if (isRead) qs.is_read = isRead;
    if (isArchived) qs.is_archived = isArchived;
    if (since) qs.since = since;

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/listening/mentions',
        qs,
      },
      optionalHeaders
    );
  }

  if (operation === 'getMention') {
    const mentionId = context.getNodeParameter('listeningMentionId', i) as string;
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: `/listening/mentions/${mentionId}`,
      },
      optionalHeaders
    );
  }

  if (operation === 'markMentionsRead') {
    const mentionIds = context.getNodeParameter('listeningMentionIds', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/mentions/mark-read',
        body: { ids: maybeArray(mentionIds) ?? [] },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'archiveMentions') {
    const mentionIds = context.getNodeParameter('listeningMentionIds', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/mentions/archive',
        body: { ids: maybeArray(mentionIds) ?? [] },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'listAlerts') {
    const unreadOnly = context.getNodeParameter('listeningAlertsUnreadOnly', i) as boolean;
    const priority = context.getNodeParameter('listeningAlertPriority', i) as string;
    const limit = context.getNodeParameter('listeningLimit', i) as number;
    const qs: Record<string, string | number> = {
      unread: unreadOnly ? 'true' : 'false',
      limit,
    };
    if (priority) {
      qs.priority = priority;
    }

    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/listening/alerts',
        qs,
      },
      optionalHeaders
    );
  }

  if (operation === 'markAlertsRead') {
    const alertIds = context.getNodeParameter('listeningAlertIds', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/alerts/mark-read',
        body: { ids: maybeArray(alertIds) ?? [] },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'dismissAlerts') {
    const alertIds = context.getNodeParameter('listeningAlertIds', i) as string;
    return sendRequest(
      context,
      {
        method: 'POST' as IHttpRequestMethods,
        url: '/listening/alerts/dismiss',
        body: { ids: maybeArray(alertIds) ?? [] },
        json: true,
      },
      optionalHeaders
    );
  }

  if (operation === 'getSummary') {
    return sendRequest(
      context,
      {
        method: 'GET' as IHttpRequestMethods,
        url: '/listening/summary',
      },
      optionalHeaders
    );
  }

  throw new NodeOperationError(context.getNode(), `Unknown operation: ${operation}`);
};
