import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  IDataObject,
  NodeOperationError,
} from 'n8n-workflow';

const SENDIT_API_ORIGIN = 'https://sendit.infiniteappsai.com';
const SENDIT_API_BASE_URL = `${SENDIT_API_ORIGIN}/api/v1`;

const PLATFORM_OPTIONS = [
  { name: 'X (Twitter)', value: 'x' },
  { name: 'LinkedIn', value: 'linkedin' },
  { name: 'LinkedIn Page', value: 'linkedin-page' },
  { name: 'Facebook', value: 'facebook' },
  { name: 'Instagram', value: 'instagram' },
  { name: 'Instagram Standalone', value: 'instagram-standalone' },
  { name: 'Threads', value: 'threads' },
  { name: 'Bluesky', value: 'bluesky' },
  { name: 'Mastodon', value: 'mastodon' },
  { name: 'Warpcast', value: 'warpcast' },
  { name: 'Nostr', value: 'nostr' },
  { name: 'VK', value: 'vk' },
  { name: 'YouTube', value: 'youtube' },
  { name: 'TikTok', value: 'tiktok' },
  { name: 'Reddit', value: 'reddit' },
  { name: 'Lemmy', value: 'lemmy' },
  { name: 'Discord', value: 'discord' },
  { name: 'Slack', value: 'slack' },
  { name: 'Telegram', value: 'telegram' },
  { name: 'Pinterest', value: 'pinterest' },
  { name: 'Dribbble', value: 'dribbble' },
  { name: 'Medium', value: 'medium' },
  { name: 'DEV.to', value: 'devto' },
  { name: 'Hashnode', value: 'hashnode' },
  { name: 'WordPress', value: 'wordpress' },
  { name: 'Google My Business', value: 'gmb' },
  { name: 'Listmonk', value: 'listmonk' },
  { name: 'Skool', value: 'skool' },
  { name: 'Whop', value: 'whop' },
  { name: 'Kick', value: 'kick' },
  { name: 'Twitch', value: 'twitch' },
  { name: 'Product Hunt', value: 'producthunt' },
];

function getOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function buildOptionalHeaders(teamId?: string, idempotencyKey?: string): Record<string, string> {
  const headers: Record<string, string> = {};
  if (teamId) {
    headers['X-Team-ID'] = teamId;
  }
  if (idempotencyKey) {
    headers['Idempotency-Key'] = idempotencyKey;
  }
  return headers;
}

function parseCsvList(value: string | undefined): string[] | undefined {
  if (!value) {
    return undefined;
  }
  const parsed = value
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
  return parsed.length > 0 ? parsed : undefined;
}

function maybeArray(value: unknown): string[] | undefined {
  if (Array.isArray(value)) {
    const normalized = value
      .map((item) => (typeof item === 'string' ? item.trim() : String(item)))
      .filter((item) => item.length > 0);
    return normalized.length > 0 ? normalized : undefined;
  }

  if (typeof value === 'string') {
    return parseCsvList(value);
  }

  return undefined;
}

function parseJsonInput(value: string | undefined, label: string): unknown {
  if (!value || value.trim().length === 0) {
    return undefined;
  }

  try {
    return JSON.parse(value);
  } catch {
    throw new Error(`${label} must be valid JSON`);
  }
}

function normalizeResponse(response: unknown): IDataObject {
  if (response === null || response === undefined) {
    return {};
  }

  if (Buffer.isBuffer(response)) {
    return {
      dataBase64: response.toString('base64'),
      byteLength: response.length,
    };
  }

  if (typeof response === 'string') {
    return { data: response };
  }

  if (typeof response !== 'object') {
    return { data: response as string | number | boolean };
  }

  return response as IDataObject;
}

async function requestV1(
  context: IExecuteFunctions,
  request: { url: string; [key: string]: unknown },
  optionalHeaders: Record<string, string>,
): Promise<unknown> {
  const requestHeaders = (request.headers as Record<string, string> | undefined) ?? {};
  const headers = {
    ...requestHeaders,
    ...optionalHeaders,
  };

  return context.helpers.httpRequestWithAuthentication.call(
    context,
    'sendItApi',
    {
      baseURL: SENDIT_API_BASE_URL,
      ...request,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    } as any,
  );
}

async function requestAbsolute(
  context: IExecuteFunctions,
  request: { url: string; [key: string]: unknown },
  optionalHeaders: Record<string, string>,
): Promise<unknown> {
  const requestHeaders = (request.headers as Record<string, string> | undefined) ?? {};
  const headers = {
    ...requestHeaders,
    ...optionalHeaders,
  };

  return context.helpers.httpRequestWithAuthentication.call(
    context,
    'sendItApi',
    {
      baseURL: SENDIT_API_ORIGIN,
      ...request,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
    } as any,
  );
}

function assertObject(
  value: unknown,
  message: string,
): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

export class SendIt implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SendIt',
    name: 'sendIt',
    icon: 'file:sendit.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Multi-platform social media publishing with AI content generation',
    defaults: {
      name: 'SendIt',
    },
    inputs: ['main'],
    outputs: ['main'],
    credentials: [
      {
        name: 'sendItApi',
        required: true,
      },
    ],
    requestDefaults: {
      baseURL: SENDIT_API_BASE_URL,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    },
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Post', value: 'post' },
          { name: 'AI', value: 'ai' },
          { name: 'Media', value: 'media' },
          { name: 'Scheduled Post', value: 'scheduledPost' },
          { name: 'Account', value: 'account' },
          { name: 'Validation', value: 'validation' },
          { name: 'Analytics', value: 'analytics' },
          { name: 'Brand Voice', value: 'brandVoice' },
          { name: 'Campaign', value: 'campaign' },
          { name: 'Inbox', value: 'inbox' },
          { name: 'Listening', value: 'listening' },
          { name: 'AI Media', value: 'aiMedia' },
          { name: 'Meta', value: 'meta' },
          { name: 'Content Score', value: 'contentScore' },
          { name: 'Library', value: 'library' },
          { name: 'Approvals', value: 'approvals' },
          { name: 'Bulk Schedule', value: 'bulkSchedule' },
          { name: 'Connect', value: 'connect' },
          { name: 'Webhooks', value: 'webhooks' },
          { name: 'Advanced', value: 'advanced' },
        ],
        default: 'post',
      },
      {
        displayName: 'Team ID',
        name: 'teamId',
        type: 'string',
        default: '',
        description: 'Optional team scope. Sent as X-Team-ID header when provided',
      },
      {
        displayName: 'Idempotency Key',
        name: 'idempotencyKey',
        type: 'string',
        default: '',
        description: 'Optional idempotency key. Sent as Idempotency-Key header when provided',
      },

      // ===== Operations by resource =====
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['post'] } },
        options: [
          { name: 'Publish', value: 'publish', description: 'Publish content to social media platforms immediately', action: 'Publish a post' },
          { name: 'Publish with AI', value: 'publishAi', description: 'Generate content with AI and publish to platforms', action: 'Publish with AI-generated content' },
        ],
        default: 'publish',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['ai'] } },
        options: [
          { name: 'Generate Content', value: 'generate', description: 'Generate platform-specific content from media or prompt', action: 'Generate AI content' },
        ],
        default: 'generate',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['media'] } },
        options: [
          { name: 'Upload', value: 'upload', description: 'Upload media file to get a URL', action: 'Upload media' },
        ],
        default: 'upload',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['scheduledPost'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Schedule a post for future publishing', action: 'Schedule a post' },
          { name: 'Get All', value: 'getAll', description: 'Get all scheduled posts', action: 'Get all scheduled posts' },
          { name: 'Delete', value: 'delete', description: 'Cancel a scheduled post', action: 'Cancel a scheduled post' },
          { name: 'Trigger Now', value: 'trigger', description: 'Publish a scheduled post immediately', action: 'Trigger scheduled post now' },
        ],
        default: 'create',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [{ name: 'Get All', value: 'getAll', description: 'Get all connected accounts', action: 'Get all accounts' }],
        default: 'getAll',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['validation'] } },
        options: [{ name: 'Validate', value: 'validate', description: 'Validate content before publishing', action: 'Validate content' }],
        default: 'validate',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['analytics'] } },
        options: [{ name: 'Get Analytics', value: 'getAnalytics', description: 'Get engagement analytics for posts on a platform', action: 'Get analytics for a platform' }],
        default: 'getAnalytics',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['brandVoice'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Create a new brand voice profile', action: 'Create a brand voice' },
          { name: 'List', value: 'list', description: 'List all brand voice profiles', action: 'List brand voices' },
        ],
        default: 'create',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['campaign'] } },
        options: [
          { name: 'Plan', value: 'plan', description: 'Create a new campaign with AI-planned posts', action: 'Plan a campaign' },
          { name: 'List', value: 'list', description: 'List all campaigns', action: 'List campaigns' },
          { name: 'Schedule', value: 'schedule', description: 'Schedule all posts in a campaign', action: 'Schedule a campaign' },
        ],
        default: 'plan',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['inbox'] } },
        options: [
          { name: 'List', value: 'list', description: 'List inbox threads', action: 'List inbox threads' },
          { name: 'Reply', value: 'reply', description: 'Reply to an inbox thread', action: 'Reply to a thread' },
          { name: 'Get Thread', value: 'getThread', description: 'Get a single inbox thread with messages', action: 'Get an inbox thread' },
          { name: 'Update Status', value: 'updateStatus', description: 'Update thread status', action: 'Update inbox thread status' },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['listening'] } },
        options: [
          { name: 'Refresh', value: 'refresh', description: 'Trigger a social listening refresh', action: 'Refresh social listening data' },
          { name: 'List Keywords', value: 'listKeywords', description: 'List tracked listening keywords', action: 'List listening keywords' },
          { name: 'Create Keyword', value: 'createKeyword', description: 'Create a listening keyword', action: 'Create listening keyword' },
          { name: 'Get Keyword', value: 'getKeyword', description: 'Get listening keyword by ID', action: 'Get listening keyword' },
          { name: 'Update Keyword', value: 'updateKeyword', description: 'Update listening keyword', action: 'Update listening keyword' },
          { name: 'Delete Keyword', value: 'deleteKeyword', description: 'Delete listening keyword', action: 'Delete listening keyword' },
          { name: 'List Mentions', value: 'listMentions', description: 'List mentions', action: 'List listening mentions' },
          { name: 'Get Mention', value: 'getMention', description: 'Get mention by ID', action: 'Get listening mention' },
          { name: 'Mark Mentions Read', value: 'markMentionsRead', description: 'Mark mentions as read', action: 'Mark listening mentions as read' },
          { name: 'Archive Mentions', value: 'archiveMentions', description: 'Archive mentions', action: 'Archive listening mentions' },
          { name: 'List Alerts', value: 'listAlerts', description: 'List listening alerts', action: 'List listening alerts' },
          { name: 'Mark Alerts Read', value: 'markAlertsRead', description: 'Mark alerts as read', action: 'Mark listening alerts as read' },
          { name: 'Dismiss Alerts', value: 'dismissAlerts', description: 'Dismiss alerts', action: 'Dismiss listening alerts' },
          { name: 'Get Summary', value: 'getSummary', description: 'Get listening summary', action: 'Get listening summary' },
        ],
        default: 'refresh',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['aiMedia'] } },
        options: [
          { name: 'Create', value: 'create', description: 'Generate AI media (image or video)', action: 'Create AI media' },
          { name: 'Get Status', value: 'getStatus', description: 'Get the status of an AI media generation job', action: 'Get AI media status' },
        ],
        default: 'create',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['meta'] } },
        options: [
          { name: 'Get Capabilities', value: 'getCapabilities', action: 'Get capabilities' },
          { name: 'Get Requirements', value: 'getRequirements', action: 'Get platform requirements' },
          { name: 'Get Platform Settings Schema', value: 'getPlatformSettingsSchema', action: 'Get platform settings schema' },
          { name: 'Get Best Times', value: 'getBestTimes', action: 'Get best times to post' },
          { name: 'Get Webhook Events Catalog', value: 'getWebhookEventsCatalog', action: 'Get webhook events catalog' },
          { name: 'Get Webhook Triggers', value: 'getWebhookTriggers', action: 'Get webhook triggers' },
        ],
        default: 'getCapabilities',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['contentScore'] } },
        options: [{ name: 'Score', value: 'score', action: 'Score content quality' }],
        default: 'score',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['library'] } },
        options: [
          { name: 'List', value: 'list', action: 'List library items' },
          { name: 'Create', value: 'create', action: 'Create library item' },
          { name: 'Get', value: 'get', action: 'Get library item' },
          { name: 'Update', value: 'update', action: 'Update library item' },
          { name: 'Delete', value: 'delete', action: 'Delete library item' },
          { name: 'List Categories', value: 'listCategories', action: 'List library categories' },
          { name: 'List Tags', value: 'listTags', action: 'List library tags' },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['approvals'] } },
        options: [
          { name: 'List', value: 'list', action: 'List approvals' },
          { name: 'Approve', value: 'approve', action: 'Approve post' },
          { name: 'Reject', value: 'reject', action: 'Reject post' },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['bulkSchedule'] } },
        options: [
          { name: 'List Imports', value: 'listImports', action: 'List bulk imports' },
          { name: 'Get Import', value: 'getImport', action: 'Get bulk import' },
          { name: 'Validate CSV', value: 'validateCsv', action: 'Validate CSV payload' },
          { name: 'Import CSV', value: 'importCsv', action: 'Import CSV payload' },
          { name: 'Download Template', value: 'downloadTemplate', action: 'Download bulk schedule template' },
        ],
        default: 'listImports',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['connect'] } },
        options: [
          { name: 'Get Connect Action', value: 'getConnectAction', action: 'Get connect action for platform' },
          { name: 'Connect Token', value: 'connectToken', action: 'Connect with token credentials' },
          { name: 'Connect Webhook', value: 'connectWebhook', action: 'Connect with webhook credentials' },
        ],
        default: 'getConnectAction',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['webhooks'] } },
        options: [{ name: 'Test Webhook', value: 'testWebhook', action: 'Send a test webhook delivery' }],
        default: 'testWebhook',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['advanced'] } },
        options: [{ name: 'API Request', value: 'apiRequest', action: 'Run advanced API request' }],
        default: 'apiRequest',
      },

      // ===== Existing publish / schedule fields =====
      {
        displayName: 'Platforms',
        name: 'platforms',
        type: 'multiOptions',
        options: PLATFORM_OPTIONS,
        default: [],
        required: true,
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation', 'ai', 'contentScore'],
            operation: ['publish', 'publishAi', 'create', 'validate', 'generate', 'score'],
          },
        },
        description: 'Select platforms to publish to',
      },
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation', 'contentScore'],
            operation: ['publish', 'create', 'validate', 'score'],
          },
        },
        description: 'The text content of your post',
      },
      {
        displayName: 'Media URL',
        name: 'mediaUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation', 'ai', 'contentScore'],
            operation: ['publish', 'publishAi', 'create', 'validate', 'generate', 'score'],
          },
        },
        description: 'URL to an image or video (required for some platforms)',
      },
      {
        displayName: 'Input Mode',
        name: 'mediaInputMode',
        type: 'options',
        options: [
          { name: 'Binary Data', value: 'binary' },
          { name: 'File Path', value: 'filePath' },
        ],
        default: 'binary',
        displayOptions: { show: { resource: ['media'], operation: ['upload'] } },
        description: 'How to provide the media file',
      },
      {
        displayName: 'Binary Property',
        name: 'binaryPropertyName',
        type: 'string',
        default: 'data',
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            mediaInputMode: ['binary'],
          },
        },
        description: 'Name of the binary property containing the file',
      },
      {
        displayName: 'File Path',
        name: 'filePath',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['media'],
            operation: ['upload'],
            mediaInputMode: ['filePath'],
          },
        },
        description: 'Absolute path to the media file',
      },
      {
        displayName: 'Prompt',
        name: 'aiPrompt',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: { show: { resource: ['post', 'ai'], operation: ['publishAi', 'generate'] } },
        description: 'Additional context or instructions for AI content generation',
      },
      {
        displayName: 'Scheduled Time',
        name: 'scheduledTime',
        type: 'dateTime',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['scheduledPost'], operation: ['create'] } },
        description: 'When to publish the post',
      },
      {
        displayName: 'Schedule ID',
        name: 'scheduleId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['scheduledPost'], operation: ['delete', 'trigger'] } },
        description: 'The ID of the scheduled post',
      },
      {
        displayName: 'Platform Filter',
        name: 'platformFilter',
        type: 'options',
        options: [{ name: 'All Platforms', value: '' }, ...PLATFORM_OPTIONS],
        default: '',
        displayOptions: { show: { resource: ['scheduledPost'], operation: ['getAll'] } },
        description: 'Filter scheduled posts by platform',
      },
      {
        displayName: 'Platform',
        name: 'analyticsPlatform',
        type: 'options',
        options: PLATFORM_OPTIONS,
        default: 'linkedin',
        required: true,
        displayOptions: { show: { resource: ['analytics'], operation: ['getAnalytics'] } },
        description: 'The platform to get analytics for',
      },
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: { show: { resource: ['post', 'validation'], operation: ['publish', 'validate'] } },
        options: [
          {
            displayName: 'Media URLs (for carousel)',
            name: 'mediaUrls',
            type: 'string',
            default: '',
            description: 'Comma-separated URLs for carousel posts',
          },
          {
            displayName: 'Media Type',
            name: 'mediaType',
            type: 'options',
            options: [
              { name: 'Auto-detect', value: 'auto' },
              { name: 'Image', value: 'image' },
              { name: 'Video', value: 'video' },
            ],
            default: 'auto',
            description: 'Specify the media type',
          },
          {
            displayName: 'Facebook Mode',
            name: 'facebookMode',
            type: 'options',
            options: [
              { name: 'Auto (try Reels first)', value: 'auto' },
              { name: 'Reel', value: 'reel' },
              { name: 'Feed Video', value: 'feed' },
            ],
            default: 'auto',
            description: 'How to publish videos to Facebook',
          },
          {
            displayName: 'YouTube Mode',
            name: 'youtubeMode',
            type: 'options',
            options: [
              { name: 'Auto', value: 'auto' },
              { name: 'Short', value: 'short' },
              { name: 'Standard Video', value: 'standard' },
            ],
            default: 'auto',
            description: 'How to publish videos to YouTube',
          },
          {
            displayName: 'Pinterest Board ID',
            name: 'pinterestBoardId',
            type: 'string',
            default: '',
            description: 'Pinterest board ID to pin to',
          },
        ],
      },
      {
        displayName: 'AI Options',
        name: 'aiOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: { show: { resource: ['post', 'ai'], operation: ['publishAi', 'generate'] } },
        options: [
          {
            displayName: 'Hashtags',
            name: 'hashtags',
            type: 'options',
            options: [
              { name: 'Platform Default', value: 'platform_auto' },
              { name: 'On (include hashtags)', value: 'on' },
              { name: 'Off (no hashtags)', value: 'off' },
            ],
            default: 'platform_auto',
            description: 'Hashtag generation mode',
          },
          {
            displayName: 'Tone',
            name: 'tone',
            type: 'options',
            options: [
              { name: 'Professional', value: 'professional' },
              { name: 'Casual', value: 'casual' },
              { name: 'Energetic', value: 'energetic' },
              { name: 'Informative', value: 'informative' },
            ],
            default: 'professional',
            description: 'Content tone',
          },
          {
            displayName: 'Style',
            name: 'style',
            type: 'options',
            options: [
              { name: 'Storytelling', value: 'storytelling' },
              { name: 'Promotional', value: 'promotional' },
              { name: 'Educational', value: 'educational' },
              { name: 'Entertaining', value: 'entertaining' },
            ],
            default: 'promotional',
            description: 'Content style',
          },
          {
            displayName: 'Call To Action',
            name: 'callToAction',
            type: 'string',
            default: '',
            description: 'Call-to-action to include in content',
          },
          {
            displayName: 'Strict AI',
            name: 'strictAi',
            type: 'boolean',
            default: false,
            description: 'Fail if AI generation fails (otherwise use fallback templates)',
          },
          {
            displayName: 'Facebook Mode',
            name: 'facebookMode',
            type: 'options',
            options: [
              { name: 'Auto (try Reels first)', value: 'auto' },
              { name: 'Reel', value: 'reel' },
              { name: 'Feed Video', value: 'feed' },
            ],
            default: 'auto',
            description: 'How to publish videos to Facebook',
          },
          {
            displayName: 'YouTube Mode',
            name: 'youtubeMode',
            type: 'options',
            options: [
              { name: 'Auto', value: 'auto' },
              { name: 'Short', value: 'short' },
              { name: 'Standard Video', value: 'standard' },
            ],
            default: 'auto',
            description: 'How to publish videos to YouTube',
          },
        ],
      },

      // ===== Existing brand voice / campaign / inbox / listening / ai media fields =====
      {
        displayName: 'Name',
        name: 'brandVoiceName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Name for the brand voice profile',
      },
      {
        displayName: 'Description',
        name: 'brandVoiceDescription',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Description of the brand voice',
      },
      {
        displayName: 'Tone',
        name: 'brandVoiceTone',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Tone of voice (e.g. professional, casual, witty)',
      },
      {
        displayName: 'Vocabulary',
        name: 'brandVoiceVocabulary',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Comma-separated preferred vocabulary words',
      },
      {
        displayName: 'Banned Words',
        name: 'brandVoiceBannedWords',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Comma-separated words to avoid',
      },
      {
        displayName: 'Is Default',
        name: 'brandVoiceIsDefault',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create'] } },
        description: 'Whether this is the default brand voice',
      },
      {
        displayName: 'Objective',
        name: 'campaignObjective',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Optional high-level objective to include in the campaign brief',
      },
      {
        displayName: 'Platforms',
        name: 'campaignPlatforms',
        type: 'multiOptions',
        options: PLATFORM_OPTIONS,
        default: [],
        required: true,
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Target platforms for the campaign',
      },
      {
        displayName: 'Brief',
        name: 'campaignBrief',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Detailed campaign brief (required by API)',
      },
      {
        displayName: 'Post Count',
        name: 'campaignPostCount',
        type: 'number',
        default: 5,
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Number of posts to generate in the campaign',
      },
      {
        displayName: 'Start Date',
        name: 'campaignStartDate',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Optional campaign start date/time (ISO 8601)',
      },
      {
        displayName: 'End Date',
        name: 'campaignEndDate',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
        description: 'Optional campaign end date/time (ISO 8601)',
      },
      {
        displayName: 'Campaign ID',
        name: 'campaignId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['campaign'], operation: ['schedule'] } },
        description: 'The ID of the campaign to schedule',
      },
      {
        displayName: 'Platform Filter',
        name: 'inboxPlatformFilter',
        type: 'options',
        options: [{ name: 'All Platforms', value: '' }, ...PLATFORM_OPTIONS],
        default: '',
        displayOptions: { show: { resource: ['inbox'], operation: ['list'] } },
        description: 'Optional platform filter for inbox threads',
      },
      {
        displayName: 'Status Filter',
        name: 'inboxStatusFilter',
        type: 'options',
        options: [
          { name: 'All Statuses', value: '' },
          { name: 'Open', value: 'open' },
          { name: 'Replied', value: 'replied' },
          { name: 'Closed', value: 'closed' },
          { name: 'Archived', value: 'archived' },
        ],
        default: '',
        displayOptions: { show: { resource: ['inbox'], operation: ['list'] } },
        description: 'Optional status filter for inbox threads',
      },
      {
        displayName: 'Limit',
        name: 'inboxLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 50 },
        default: 20,
        displayOptions: { show: { resource: ['inbox'], operation: ['list'] } },
        description: 'Maximum number of threads to return (1-50)',
      },
      {
        displayName: 'Thread ID',
        name: 'inboxThreadId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['inbox'],
            operation: ['reply', 'getThread', 'updateStatus'],
          },
        },
        description: 'The ID of the inbox thread',
      },
      {
        displayName: 'Message',
        name: 'inboxMessage',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['inbox'], operation: ['reply'] } },
        description: 'The reply message content',
      },
      {
        displayName: 'Thread Status',
        name: 'inboxThreadStatus',
        type: 'options',
        options: [
          { name: 'Open', value: 'open' },
          { name: 'Replied', value: 'replied' },
          { name: 'Closed', value: 'closed' },
          { name: 'Archived', value: 'archived' },
        ],
        default: 'open',
        required: true,
        displayOptions: { show: { resource: ['inbox'], operation: ['updateStatus'] } },
        description: 'Updated status for thread',
      },
      {
        displayName: 'Platforms',
        name: 'listeningPlatforms',
        type: 'multiOptions',
        options: PLATFORM_OPTIONS,
        default: [],
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['refresh', 'createKeyword', 'updateKeyword'],
          },
        },
        description: 'Platforms for listening operation',
      },
      {
        displayName: 'Keyword IDs',
        name: 'listeningKeywordIds',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['refresh'],
          },
        },
        description: 'Comma-separated keyword IDs to refresh',
      },
      {
        displayName: 'Keyword ID',
        name: 'listeningKeywordId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['getKeyword', 'updateKeyword', 'deleteKeyword'],
          },
        },
        description: 'Listening keyword ID',
      },
      {
        displayName: 'Keyword',
        name: 'listeningKeyword',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['createKeyword'],
          },
        },
        description: 'Keyword text to monitor',
      },
      {
        displayName: 'Keyword Type',
        name: 'listeningKeywordType',
        type: 'options',
        options: [
          { name: 'Brand', value: 'brand' },
          { name: 'Competitor', value: 'competitor' },
          { name: 'Product', value: 'product' },
          { name: 'Hashtag', value: 'hashtag' },
          { name: 'Custom', value: 'custom' },
        ],
        default: 'brand',
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['createKeyword', 'updateKeyword', 'listKeywords'],
          },
        },
        description: 'Listening keyword type',
      },
      {
        displayName: 'Active Only',
        name: 'listeningActiveOnly',
        type: 'boolean',
        default: true,
        displayOptions: { show: { resource: ['listening'], operation: ['listKeywords'] } },
        description: 'Only include active keywords',
      },
      {
        displayName: 'Notify Email',
        name: 'listeningNotifyEmail',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] } },
        description: 'Enable email notifications',
      },
      {
        displayName: 'Notify Webhook',
        name: 'listeningNotifyWebhook',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] } },
        description: 'Enable webhook notifications',
      },
      {
        displayName: 'Webhook URL',
        name: 'listeningWebhookUrl',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] } },
        description: 'Webhook URL for notifications',
      },
      {
        displayName: 'Sentiment Filter',
        name: 'listeningSentimentFilter',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Positive', value: 'positive' },
          { name: 'Neutral', value: 'neutral' },
          { name: 'Negative', value: 'negative' },
        ],
        default: '',
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['createKeyword', 'updateKeyword', 'listMentions'],
          },
        },
        description: 'Sentiment filter',
      },
      {
        displayName: 'Mention ID',
        name: 'listeningMentionId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['listening'], operation: ['getMention'] } },
        description: 'Mention ID',
      },
      {
        displayName: 'Mention IDs',
        name: 'listeningMentionIds',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['listening'], operation: ['markMentionsRead', 'archiveMentions'] } },
        description: 'Comma-separated mention IDs',
      },
      {
        displayName: 'Alerts Unread Only',
        name: 'listeningAlertsUnreadOnly',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['listening'], operation: ['listAlerts'] } },
        description: 'Only include unread alerts',
      },
      {
        displayName: 'Alert Priority',
        name: 'listeningAlertPriority',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
          { name: 'High', value: 'high' },
          { name: 'Critical', value: 'critical' },
        ],
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listAlerts'] } },
        description: 'Alert priority filter',
      },
      {
        displayName: 'Listening Limit',
        name: 'listeningLimit',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions', 'listAlerts'] } },
        description: 'Max records to return',
      },
      {
        displayName: 'Listening Offset',
        name: 'listeningOffset',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Offset for pagination',
      },
      {
        displayName: 'Mention Platform',
        name: 'listeningMentionPlatform',
        type: 'options',
        options: [{ name: 'Any', value: '' }, ...PLATFORM_OPTIONS],
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Platform filter for mentions',
      },
      {
        displayName: 'Mention Keyword ID',
        name: 'listeningMentionKeywordId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Filter mentions by keyword ID',
      },
      {
        displayName: 'Mentions Is Read',
        name: 'listeningIsRead',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Read', value: 'true' },
          { name: 'Unread', value: 'false' },
        ],
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Read state filter',
      },
      {
        displayName: 'Mentions Is Archived',
        name: 'listeningIsArchived',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Archived', value: 'true' },
          { name: 'Active', value: 'false' },
        ],
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Archived state filter',
      },
      {
        displayName: 'Mentions Since',
        name: 'listeningSince',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['listening'], operation: ['listMentions'] } },
        description: 'Only mentions since this timestamp',
      },
      {
        displayName: 'Alert IDs',
        name: 'listeningAlertIds',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['listening'], operation: ['markAlertsRead', 'dismissAlerts'] } },
        description: 'Comma-separated alert IDs',
      },
      {
        displayName: 'Provider',
        name: 'aiMediaProvider',
        type: 'options',
        options: [
          { name: 'Sora', value: 'sora' },
          { name: 'Runway', value: 'runway' },
          { name: 'Pika', value: 'pika' },
          { name: 'Adobe Express', value: 'adobe-express' },
        ],
        default: 'sora',
        required: true,
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
        description: 'AI media generation provider',
      },
      {
        displayName: 'Prompt',
        name: 'aiMediaPrompt',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
        description: 'Prompt describing the media to generate',
      },
      {
        displayName: 'Media Type',
        name: 'aiMediaType',
        type: 'options',
        options: [
          { name: 'Image', value: 'image' },
          { name: 'Video', value: 'video' },
        ],
        default: 'image',
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
        description: 'Type of media to generate',
      },
      {
        displayName: 'Style Preset',
        name: 'aiMediaStylePreset',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
        description: 'Optional style preset for generation',
      },
      {
        displayName: 'Job ID',
        name: 'aiMediaJobId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['aiMedia'], operation: ['getStatus'] } },
        description: 'The ID of the AI media generation job',
      },

      // ===== New Meta fields =====
      {
        displayName: 'Platform',
        name: 'metaPlatform',
        type: 'options',
        options: PLATFORM_OPTIONS,
        default: 'linkedin',
        required: true,
        displayOptions: {
          show: {
            resource: ['meta'],
            operation: ['getRequirements', 'getPlatformSettingsSchema', 'getBestTimes'],
          },
        },
        description: 'Platform for this meta operation',
      },
      {
        displayName: 'Best Times Limit',
        name: 'metaBestTimesLimit',
        type: 'number',
        default: 5,
        displayOptions: {
          show: {
            resource: ['meta'],
            operation: ['getBestTimes'],
          },
        },
        description: 'Maximum best-time recommendations to return',
      },

      // ===== Content score fields =====
      {
        displayName: 'Score Media URLs',
        name: 'scoreMediaUrls',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['contentScore'], operation: ['score'] } },
        description: 'Comma-separated media URLs for scoring',
      },
      {
        displayName: 'Score Scheduled Time',
        name: 'scoreScheduledTime',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['contentScore'], operation: ['score'] } },
        description: 'Optional scheduled time for score context',
      },

      // ===== Library fields =====
      {
        displayName: 'Library Item ID',
        name: 'libraryItemId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['get', 'update', 'delete'],
          },
        },
        description: 'Library item ID',
      },
      {
        displayName: 'Title',
        name: 'libraryTitle',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['create', 'update'],
          },
        },
        description: 'Library item title',
      },
      {
        displayName: 'Body Text',
        name: 'libraryText',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['create', 'update'],
          },
        },
        description: 'Library item text body',
      },
      {
        displayName: 'Library Type',
        name: 'libraryType',
        type: 'options',
        options: [
          { name: 'Draft', value: 'draft' },
          { name: 'Template', value: 'template' },
          { name: 'Evergreen', value: 'evergreen' },
        ],
        default: 'draft',
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['list', 'create', 'update'],
          },
        },
        description: 'Library content type',
      },
      {
        displayName: 'Category',
        name: 'libraryCategory',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['list', 'create', 'update'],
          },
        },
        description: 'Library category',
      },
      {
        displayName: 'Tags',
        name: 'libraryTags',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['list', 'create', 'update'],
          },
        },
        description: 'Comma-separated tags',
      },
      {
        displayName: 'Target Platforms',
        name: 'libraryTargetPlatforms',
        type: 'multiOptions',
        options: PLATFORM_OPTIONS,
        default: [],
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['list', 'create', 'update'],
          },
        },
        description: 'Target platforms for this library item',
      },
      {
        displayName: 'Search',
        name: 'librarySearch',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['library'], operation: ['list'] } },
        description: 'Search text',
      },
      {
        displayName: 'Limit',
        name: 'libraryLimit',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['library'], operation: ['list'] } },
        description: 'Maximum number of library items to return',
      },
      {
        displayName: 'Offset',
        name: 'libraryOffset',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['library'], operation: ['list'] } },
        description: 'Offset for pagination',
      },
      {
        displayName: 'Evergreen Enabled',
        name: 'libraryEvergreenEnabled',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['create', 'update'],
          },
        },
        description: 'Enable evergreen republishing',
      },
      {
        displayName: 'Evergreen Interval Days',
        name: 'libraryEvergreenIntervalDays',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['create', 'update'],
          },
        },
        description: 'Optional evergreen interval days',
      },
      {
        displayName: 'Evergreen Max Publishes',
        name: 'libraryEvergreenMaxPublishes',
        type: 'number',
        default: 0,
        displayOptions: {
          show: {
            resource: ['library'],
            operation: ['create', 'update'],
          },
        },
        description: 'Optional max evergreen publish count',
      },

      // ===== Approvals fields =====
      {
        displayName: 'Approval Post ID',
        name: 'approvalPostId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['approvals'],
            operation: ['approve', 'reject'],
          },
        },
        description: 'Scheduled post ID in approvals queue',
      },
      {
        displayName: 'Approval Comment',
        name: 'approvalComment',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['approvals'],
            operation: ['approve'],
          },
        },
        description: 'Optional approval comment',
      },
      {
        displayName: 'Rejection Reason',
        name: 'approvalReason',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['approvals'],
            operation: ['reject'],
          },
        },
        description: 'Required rejection reason',
      },

      // ===== Bulk schedule fields =====
      {
        displayName: 'Import ID',
        name: 'bulkImportId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['bulkSchedule'], operation: ['getImport'] } },
        description: 'Bulk import ID',
      },
      {
        displayName: 'CSV Content',
        name: 'bulkCsvContent',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['bulkSchedule'],
            operation: ['validateCsv', 'importCsv'],
          },
        },
        description: 'Raw CSV string payload',
      },
      {
        displayName: 'Filename',
        name: 'bulkFilename',
        type: 'string',
        default: 'upload.csv',
        displayOptions: {
          show: {
            resource: ['bulkSchedule'],
            operation: ['validateCsv', 'importCsv'],
          },
        },
        description: 'CSV filename for import metadata',
      },
      {
        displayName: 'Skip Errors',
        name: 'bulkSkipErrors',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['bulkSchedule'], operation: ['importCsv'] } },
        description: 'Continue import even if some rows fail validation',
      },

      // ===== Connect fields =====
      {
        displayName: 'Connect Platform',
        name: 'connectPlatform',
        type: 'options',
        options: PLATFORM_OPTIONS,
        default: 'linkedin',
        required: true,
        displayOptions: { show: { resource: ['connect'], operation: ['getConnectAction', 'connectToken', 'connectWebhook'] } },
        description: 'Platform to connect',
      },
      {
        displayName: 'Credentials JSON',
        name: 'connectCredentialsJson',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['connect'], operation: ['connectToken'] } },
        description: 'JSON object of token/custom credentials',
      },
      {
        displayName: 'Webhook URL',
        name: 'connectWebhookUrl',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['connect'], operation: ['connectWebhook'] } },
        description: 'Webhook URL for webhook-based platform connections',
      },
      {
        displayName: 'Metadata JSON',
        name: 'connectMetadataJson',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        displayOptions: { show: { resource: ['connect'], operation: ['connectWebhook'] } },
        description: 'Optional JSON metadata object',
      },

      // ===== Webhook helper fields =====
      {
        displayName: 'Webhook ID',
        name: 'webhookId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['webhooks'], operation: ['testWebhook'] } },
        description: 'Webhook subscription ID to test',
      },

      // ===== Advanced fields =====
      {
        displayName: 'Method',
        name: 'advancedMethod',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'GET',
        required: true,
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'HTTP method for advanced request',
      },
      {
        displayName: 'Path',
        name: 'advancedPath',
        type: 'string',
        default: '/api/v1/capabilities',
        required: true,
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'Absolute API path starting with /api/v1/ or /api/v2/',
      },
      {
        displayName: 'Query JSON',
        name: 'advancedQueryJson',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'Optional JSON object for query string params',
      },
      {
        displayName: 'Body JSON',
        name: 'advancedBodyJson',
        type: 'string',
        typeOptions: { rows: 6 },
        default: '',
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'Optional JSON payload for request body',
      },
      {
        displayName: 'Response Mode',
        name: 'advancedResponseMode',
        type: 'options',
        options: [
          { name: 'JSON', value: 'json' },
          { name: 'Text', value: 'text' },
          { name: 'Binary', value: 'binary' },
        ],
        default: 'json',
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'How to decode the response payload',
      },
      {
        displayName: 'Request Timeout (ms)',
        name: 'requestTimeoutMs',
        type: 'number',
        default: 30000,
        description: 'Optional timeout. Applied by advanced API request operation',
      },
    ],
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const teamId = getOptionalString(this.getNodeParameter('teamId', i) as string);
        const idempotencyKey = getOptionalString(this.getNodeParameter('idempotencyKey', i) as string);
        const optionalHeaders = buildOptionalHeaders(teamId, idempotencyKey);

        let response: unknown = {};

        if (resource === 'post') {
          if (operation === 'publish') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
              mediaUrls?: string;
              mediaType?: string;
              facebookMode?: string;
              youtubeMode?: string;
              pinterestBoardId?: string;
            };

            response = await requestV1(
              this,
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
          } else if (operation === 'publishAi') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const prompt = this.getNodeParameter('aiPrompt', i) as string;
            const aiOptions = this.getNodeParameter('aiOptions', i) as {
              hashtags?: string;
              tone?: string;
              style?: string;
              callToAction?: string;
              strictAi?: boolean;
              facebookMode?: string;
              youtubeMode?: string;
            };

            const body: Record<string, unknown> = {
              platforms,
              mediaUrl: mediaUrl || undefined,
              prompt: prompt || undefined,
              hashtags: aiOptions.hashtags || 'platform_auto',
              strictAi: aiOptions.strictAi || false,
              facebookMode: aiOptions.facebookMode,
              youtubeMode: aiOptions.youtubeMode,
            };

            if (aiOptions.tone || aiOptions.style || aiOptions.callToAction) {
              body.generation = {
                tone: aiOptions.tone,
                style: aiOptions.style,
                callToAction: aiOptions.callToAction,
              };
            }

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/publish-ai',
                body,
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'ai') {
          if (operation === 'generate') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const prompt = this.getNodeParameter('aiPrompt', i) as string;
            const aiOptions = this.getNodeParameter('aiOptions', i) as {
              hashtags?: string;
              tone?: string;
              style?: string;
              callToAction?: string;
              strictAi?: boolean;
            };

            const body: Record<string, unknown> = {
              platforms,
              mediaUrl: mediaUrl || undefined,
              prompt: prompt || undefined,
              hashtags: aiOptions.hashtags || 'platform_auto',
              strictAi: aiOptions.strictAi || false,
            };

            if (aiOptions.tone || aiOptions.style || aiOptions.callToAction) {
              body.generation = {
                tone: aiOptions.tone,
                style: aiOptions.style,
                callToAction: aiOptions.callToAction,
              };
            }

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/ai/generate-content',
                body,
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'media') {
          if (operation === 'upload') {
            const inputMode = this.getNodeParameter('mediaInputMode', i) as string;

            if (inputMode === 'binary') {
              const binaryPropertyName = this.getNodeParameter('binaryPropertyName', i) as string;
              const binaryData = this.helpers.assertBinaryData(i, binaryPropertyName);
              const buffer = await this.helpers.getBinaryDataBuffer(i, binaryPropertyName);

              const formData = new FormData();
              formData.append('file', new Blob([buffer]), binaryData.fileName || 'upload');

              response = await requestV1(
                this,
                {
                  method: 'POST' as IHttpRequestMethods,
                  url: '/media/upload',
                  body: formData,
                },
                optionalHeaders,
              );
            } else {
              const filePath = this.getNodeParameter('filePath', i) as string;
              const fs = await import('fs/promises');
              const path = await import('path');

              const fileBuffer = await fs.readFile(filePath);
              const fileName = path.basename(filePath);

              const formData = new FormData();
              formData.append('file', new Blob([fileBuffer]), fileName);

              response = await requestV1(
                this,
                {
                  method: 'POST' as IHttpRequestMethods,
                  url: '/media/upload',
                  body: formData,
                },
                optionalHeaders,
              );
            }
          }
        } else if (resource === 'scheduledPost') {
          if (operation === 'create') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const scheduledTime = this.getNodeParameter('scheduledTime', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/schedule',
                body: {
                  platforms,
                  content: {
                    text,
                    mediaUrl: mediaUrl || undefined,
                  },
                  scheduledTime,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'getAll') {
            const platformFilter = this.getNodeParameter('platformFilter', i) as string;
            const qs: Record<string, string> = {};
            if (platformFilter) {
              qs.platform = platformFilter;
            }

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/scheduled',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'delete') {
            const scheduleId = this.getNodeParameter('scheduleId', i) as string;

            response = await requestV1(
              this,
              {
                method: 'DELETE' as IHttpRequestMethods,
                url: `/scheduled/${scheduleId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'trigger') {
            const scheduleId = this.getNodeParameter('scheduleId', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/scheduled/${scheduleId}/trigger`,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'account') {
          if (operation === 'getAll') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/accounts',
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'validation') {
          if (operation === 'validate') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
              mediaUrls?: string;
              mediaType?: string;
            };

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/validate',
                body: {
                  platforms,
                  content: {
                    text,
                    mediaUrl: mediaUrl || undefined,
                    mediaUrls: maybeArray(additionalOptions.mediaUrls),
                    mediaType: additionalOptions.mediaType || 'auto',
                  },
                },
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'analytics') {
          if (operation === 'getAnalytics') {
            const platform = this.getNodeParameter('analyticsPlatform', i) as string;

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/analytics',
                qs: { platform },
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'brandVoice') {
          if (operation === 'create') {
            const name = this.getNodeParameter('brandVoiceName', i) as string;
            const description = this.getNodeParameter('brandVoiceDescription', i) as string;
            const tone = this.getNodeParameter('brandVoiceTone', i) as string;
            const vocabulary = this.getNodeParameter('brandVoiceVocabulary', i) as string;
            const bannedWords = this.getNodeParameter('brandVoiceBannedWords', i) as string;
            const isDefault = this.getNodeParameter('brandVoiceIsDefault', i) as boolean;

            const body: Record<string, unknown> = {
              name,
              description: description || undefined,
              tone: tone || undefined,
              vocabulary: maybeArray(vocabulary),
              bannedWords: maybeArray(bannedWords),
              isDefault,
            };

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/brand-voice',
                body,
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'list') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/brand-voice',
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'campaign') {
          if (operation === 'plan') {
            const objective = this.getNodeParameter('campaignObjective', i) as string;
            const platforms = this.getNodeParameter('campaignPlatforms', i) as string[];
            const brief = this.getNodeParameter('campaignBrief', i) as string;
            const postCount = this.getNodeParameter('campaignPostCount', i) as number;
            const startDate = this.getNodeParameter('campaignStartDate', i) as string;
            const endDate = this.getNodeParameter('campaignEndDate', i) as string;

            const normalizedBrief = brief || objective;

            response = await requestV1(
              this,
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
              optionalHeaders,
            );
          } else if (operation === 'list') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/campaigns',
              },
              optionalHeaders,
            );
          } else if (operation === 'schedule') {
            const campaignId = this.getNodeParameter('campaignId', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/campaigns/${campaignId}/schedule`,
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'inbox') {
          if (operation === 'list') {
            const platformFilter = this.getNodeParameter('inboxPlatformFilter', i) as string;
            const statusFilter = this.getNodeParameter('inboxStatusFilter', i) as string;
            const limit = this.getNodeParameter('inboxLimit', i) as number;
            const qs: Record<string, string | number> = { limit };

            if (platformFilter) {
              qs.platform = platformFilter;
            }
            if (statusFilter) {
              qs.status = statusFilter;
            }

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/inbox',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'reply') {
            const threadId = this.getNodeParameter('inboxThreadId', i) as string;
            const message = this.getNodeParameter('inboxMessage', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/inbox/${threadId}/reply`,
                body: { text: message },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'getThread') {
            const threadId = this.getNodeParameter('inboxThreadId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/inbox/${threadId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'updateStatus') {
            const threadId = this.getNodeParameter('inboxThreadId', i) as string;
            const status = this.getNodeParameter('inboxThreadStatus', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/inbox/${threadId}/status`,
                body: { status },
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'listening') {
          if (operation === 'refresh') {
            const platforms = this.getNodeParameter('listeningPlatforms', i) as string[];
            const keywordIdsRaw = this.getNodeParameter('listeningKeywordIds', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/listening/refresh',
                body: {
                  platforms,
                  keywordIds: maybeArray(keywordIdsRaw),
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'listKeywords') {
            const activeOnly = this.getNodeParameter('listeningActiveOnly', i) as boolean;
            const keywordType = this.getNodeParameter('listeningKeywordType', i) as string;
            const qs: Record<string, string> = {
              active: activeOnly ? 'true' : 'false',
            };
            if (keywordType) {
              qs.type = keywordType;
            }

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/listening/keywords',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'createKeyword') {
            const keyword = this.getNodeParameter('listeningKeyword', i) as string;
            const type = this.getNodeParameter('listeningKeywordType', i) as string;
            const platforms = this.getNodeParameter('listeningPlatforms', i) as string[];
            const notifyEmail = this.getNodeParameter('listeningNotifyEmail', i) as boolean;
            const notifyWebhook = this.getNodeParameter('listeningNotifyWebhook', i) as boolean;
            const webhookUrl = this.getNodeParameter('listeningWebhookUrl', i) as string;
            const sentimentFilter = this.getNodeParameter('listeningSentimentFilter', i) as string;

            response = await requestV1(
              this,
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
              optionalHeaders,
            );
          } else if (operation === 'getKeyword') {
            const keywordId = this.getNodeParameter('listeningKeywordId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/listening/keywords/${keywordId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'updateKeyword') {
            const keywordId = this.getNodeParameter('listeningKeywordId', i) as string;
            const type = this.getNodeParameter('listeningKeywordType', i) as string;
            const platforms = this.getNodeParameter('listeningPlatforms', i) as string[];
            const notifyEmail = this.getNodeParameter('listeningNotifyEmail', i) as boolean;
            const notifyWebhook = this.getNodeParameter('listeningNotifyWebhook', i) as boolean;
            const webhookUrl = this.getNodeParameter('listeningWebhookUrl', i) as string;
            const sentimentFilter = this.getNodeParameter('listeningSentimentFilter', i) as string;

            response = await requestV1(
              this,
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
              optionalHeaders,
            );
          } else if (operation === 'deleteKeyword') {
            const keywordId = this.getNodeParameter('listeningKeywordId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'DELETE' as IHttpRequestMethods,
                url: `/listening/keywords/${keywordId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'listMentions') {
            const keywordId = this.getNodeParameter('listeningMentionKeywordId', i) as string;
            const platform = this.getNodeParameter('listeningMentionPlatform', i) as string;
            const sentiment = this.getNodeParameter('listeningSentimentFilter', i) as string;
            const isRead = this.getNodeParameter('listeningIsRead', i) as string;
            const isArchived = this.getNodeParameter('listeningIsArchived', i) as string;
            const since = this.getNodeParameter('listeningSince', i) as string;
            const limit = this.getNodeParameter('listeningLimit', i) as number;
            const offset = this.getNodeParameter('listeningOffset', i) as number;

            const qs: Record<string, string | number> = {
              limit,
              offset,
            };

            if (keywordId) qs.keyword_id = keywordId;
            if (platform) qs.platform = platform;
            if (sentiment) qs.sentiment = sentiment;
            if (isRead) qs.is_read = isRead;
            if (isArchived) qs.is_archived = isArchived;
            if (since) qs.since = since;

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/listening/mentions',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'getMention') {
            const mentionId = this.getNodeParameter('listeningMentionId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/listening/mentions/${mentionId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'markMentionsRead') {
            const mentionIds = this.getNodeParameter('listeningMentionIds', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/listening/mentions/mark-read',
                body: {
                  ids: maybeArray(mentionIds) ?? [],
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'archiveMentions') {
            const mentionIds = this.getNodeParameter('listeningMentionIds', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/listening/mentions/archive',
                body: {
                  ids: maybeArray(mentionIds) ?? [],
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'listAlerts') {
            const unreadOnly = this.getNodeParameter('listeningAlertsUnreadOnly', i) as boolean;
            const priority = this.getNodeParameter('listeningAlertPriority', i) as string;
            const limit = this.getNodeParameter('listeningLimit', i) as number;
            const qs: Record<string, string | number> = {
              unread: unreadOnly ? 'true' : 'false',
              limit,
            };
            if (priority) {
              qs.priority = priority;
            }

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/listening/alerts',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'markAlertsRead') {
            const alertIds = this.getNodeParameter('listeningAlertIds', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/listening/alerts/mark-read',
                body: {
                  ids: maybeArray(alertIds) ?? [],
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'dismissAlerts') {
            const alertIds = this.getNodeParameter('listeningAlertIds', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/listening/alerts/dismiss',
                body: {
                  ids: maybeArray(alertIds) ?? [],
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'getSummary') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/listening/summary',
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'aiMedia') {
          if (operation === 'create') {
            const provider = this.getNodeParameter('aiMediaProvider', i) as string;
            const prompt = this.getNodeParameter('aiMediaPrompt', i) as string;
            const mediaType = this.getNodeParameter('aiMediaType', i) as string;
            const stylePreset = this.getNodeParameter('aiMediaStylePreset', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/ai-media',
                body: {
                  provider,
                  prompt,
                  media_type: mediaType,
                  parameters: stylePreset ? { stylePreset } : {},
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'getStatus') {
            const jobId = this.getNodeParameter('aiMediaJobId', i) as string;

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/ai-media/${jobId}`,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'meta') {
          if (operation === 'getCapabilities') {
            response = await requestV1(this, { method: 'GET' as IHttpRequestMethods, url: '/capabilities' }, optionalHeaders);
          } else if (operation === 'getRequirements') {
            const platform = this.getNodeParameter('metaPlatform', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/requirements',
                qs: { platform },
              },
              optionalHeaders,
            );
          } else if (operation === 'getPlatformSettingsSchema') {
            const platform = this.getNodeParameter('metaPlatform', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/platforms/schema',
                qs: { platform },
              },
              optionalHeaders,
            );
          } else if (operation === 'getBestTimes') {
            const platform = this.getNodeParameter('metaPlatform', i) as string;
            const limit = this.getNodeParameter('metaBestTimesLimit', i) as number;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/best-times',
                qs: { platform, limit },
              },
              optionalHeaders,
            );
          } else if (operation === 'getWebhookEventsCatalog') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/webhooks/events-catalog',
              },
              optionalHeaders,
            );
          } else if (operation === 'getWebhookTriggers') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/webhooks/triggers',
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'contentScore') {
          if (operation === 'score') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const scoreMediaUrls = this.getNodeParameter('scoreMediaUrls', i) as string;
            const scoreScheduledTime = this.getNodeParameter('scoreScheduledTime', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/content-score',
                body: {
                  platforms,
                  text,
                  mediaUrl: mediaUrl || undefined,
                  mediaUrls: maybeArray(scoreMediaUrls),
                  scheduledTime: scoreScheduledTime || undefined,
                },
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'library') {
          if (operation === 'list') {
            const libraryType = this.getNodeParameter('libraryType', i) as string;
            const category = this.getNodeParameter('libraryCategory', i) as string;
            const tags = this.getNodeParameter('libraryTags', i) as string;
            const targetPlatforms = this.getNodeParameter('libraryTargetPlatforms', i) as string[];
            const search = this.getNodeParameter('librarySearch', i) as string;
            const limit = this.getNodeParameter('libraryLimit', i) as number;
            const offset = this.getNodeParameter('libraryOffset', i) as number;

            const qs: Record<string, string | number> = { limit, offset };
            if (libraryType) qs.type = libraryType;
            if (category) qs.category = category;
            if (tags) qs.tags = tags;
            if (targetPlatforms.length > 0) qs.platform = targetPlatforms[0];
            if (search) qs.search = search;

            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/library',
                qs,
              },
              optionalHeaders,
            );
          } else if (operation === 'create') {
            const title = this.getNodeParameter('libraryTitle', i) as string;
            const text = this.getNodeParameter('libraryText', i) as string;
            const libraryType = this.getNodeParameter('libraryType', i) as string;
            const category = this.getNodeParameter('libraryCategory', i) as string;
            const tags = this.getNodeParameter('libraryTags', i) as string;
            const targetPlatforms = this.getNodeParameter('libraryTargetPlatforms', i) as string[];
            const evergreenEnabled = this.getNodeParameter('libraryEvergreenEnabled', i) as boolean;
            const evergreenIntervalDays = this.getNodeParameter('libraryEvergreenIntervalDays', i) as number;
            const evergreenMaxPublishes = this.getNodeParameter('libraryEvergreenMaxPublishes', i) as number;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/library',
                body: {
                  title,
                  text,
                  type: libraryType,
                  category: category || undefined,
                  tags: maybeArray(tags),
                  targetPlatforms: targetPlatforms.length > 0 ? targetPlatforms : undefined,
                  evergreenEnabled,
                  evergreenIntervalDays: evergreenIntervalDays > 0 ? evergreenIntervalDays : undefined,
                  evergreenMaxPublishes: evergreenMaxPublishes > 0 ? evergreenMaxPublishes : undefined,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'get') {
            const itemId = this.getNodeParameter('libraryItemId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/library/${itemId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'update') {
            const itemId = this.getNodeParameter('libraryItemId', i) as string;
            const title = this.getNodeParameter('libraryTitle', i) as string;
            const text = this.getNodeParameter('libraryText', i) as string;
            const libraryType = this.getNodeParameter('libraryType', i) as string;
            const category = this.getNodeParameter('libraryCategory', i) as string;
            const tags = this.getNodeParameter('libraryTags', i) as string;
            const targetPlatforms = this.getNodeParameter('libraryTargetPlatforms', i) as string[];
            const evergreenEnabled = this.getNodeParameter('libraryEvergreenEnabled', i) as boolean;
            const evergreenIntervalDays = this.getNodeParameter('libraryEvergreenIntervalDays', i) as number;
            const evergreenMaxPublishes = this.getNodeParameter('libraryEvergreenMaxPublishes', i) as number;

            response = await requestV1(
              this,
              {
                method: 'PATCH' as IHttpRequestMethods,
                url: `/library/${itemId}`,
                body: {
                  title,
                  text,
                  type: libraryType,
                  category: category || undefined,
                  tags: maybeArray(tags),
                  targetPlatforms: targetPlatforms.length > 0 ? targetPlatforms : undefined,
                  evergreenEnabled,
                  evergreenIntervalDays: evergreenIntervalDays > 0 ? evergreenIntervalDays : undefined,
                  evergreenMaxPublishes: evergreenMaxPublishes > 0 ? evergreenMaxPublishes : undefined,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'delete') {
            const itemId = this.getNodeParameter('libraryItemId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'DELETE' as IHttpRequestMethods,
                url: `/library/${itemId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'listCategories') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/library/categories',
              },
              optionalHeaders,
            );
          } else if (operation === 'listTags') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/library/tags',
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'approvals') {
          if (operation === 'list') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/approvals',
              },
              optionalHeaders,
            );
          } else if (operation === 'approve') {
            const postId = this.getNodeParameter('approvalPostId', i) as string;
            const comment = this.getNodeParameter('approvalComment', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/approvals/${postId}/approve`,
                body: {
                  comment: comment || undefined,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'reject') {
            const postId = this.getNodeParameter('approvalPostId', i) as string;
            const reason = this.getNodeParameter('approvalReason', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/approvals/${postId}/reject`,
                body: { reason },
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'bulkSchedule') {
          if (operation === 'listImports') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/bulk-schedule',
              },
              optionalHeaders,
            );
          } else if (operation === 'getImport') {
            const importId = this.getNodeParameter('bulkImportId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/bulk-schedule/${importId}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'validateCsv') {
            const csvContent = this.getNodeParameter('bulkCsvContent', i) as string;
            const filename = this.getNodeParameter('bulkFilename', i) as string;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/bulk-schedule/validate',
                body: {
                  csvContent,
                  filename,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'importCsv') {
            const csvContent = this.getNodeParameter('bulkCsvContent', i) as string;
            const filename = this.getNodeParameter('bulkFilename', i) as string;
            const skipErrors = this.getNodeParameter('bulkSkipErrors', i) as boolean;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/bulk-schedule/import',
                body: {
                  csvContent,
                  filename,
                  skipErrors,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'downloadTemplate') {
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/bulk-schedule/template',
                json: false,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'connect') {
          if (operation === 'getConnectAction') {
            const platform = this.getNodeParameter('connectPlatform', i) as string;
            response = await requestV1(
              this,
              {
                method: 'GET' as IHttpRequestMethods,
                url: `/connect/${platform}`,
              },
              optionalHeaders,
            );
          } else if (operation === 'connectToken') {
            const platform = this.getNodeParameter('connectPlatform', i) as string;
            const credentialsJson = this.getNodeParameter('connectCredentialsJson', i) as string;
            const parsed = parseJsonInput(credentialsJson, 'Credentials JSON');
            const credentials = assertObject(parsed, 'Credentials JSON must parse to an object');

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/connect/token',
                body: {
                  platform,
                  credentials,
                },
                json: true,
              },
              optionalHeaders,
            );
          } else if (operation === 'connectWebhook') {
            const platform = this.getNodeParameter('connectPlatform', i) as string;
            const webhookUrl = this.getNodeParameter('connectWebhookUrl', i) as string;
            const metadataJson = this.getNodeParameter('connectMetadataJson', i) as string;
            const parsedMetadata = parseJsonInput(metadataJson, 'Metadata JSON');
            const metadata = parsedMetadata ? assertObject(parsedMetadata, 'Metadata JSON must parse to an object') : undefined;

            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/connect/webhook',
                body: {
                  platform,
                  webhookUrl,
                  metadata,
                },
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'webhooks') {
          if (operation === 'testWebhook') {
            const webhookId = this.getNodeParameter('webhookId', i) as string;
            response = await requestV1(
              this,
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/webhooks/${webhookId}/test`,
                json: true,
              },
              optionalHeaders,
            );
          }
        } else if (resource === 'advanced') {
          if (operation === 'apiRequest') {
            const method = this.getNodeParameter('advancedMethod', i) as IHttpRequestMethods;
            const path = this.getNodeParameter('advancedPath', i) as string;
            const queryJson = this.getNodeParameter('advancedQueryJson', i) as string;
            const bodyJson = this.getNodeParameter('advancedBodyJson', i) as string;
            const responseMode = this.getNodeParameter('advancedResponseMode', i) as string;
            const requestTimeoutMs = this.getNodeParameter('requestTimeoutMs', i) as number;

            const normalizedPath = getOptionalString(path);
            if (!normalizedPath) {
              throw new NodeOperationError(this.getNode(), 'Path is required for advanced API request');
            }

            if (!/^\/api\/v[12]\//.test(normalizedPath)) {
              throw new NodeOperationError(
                this.getNode(),
                'Advanced path must start with /api/v1/ or /api/v2/',
              );
            }

            const parsedQuery = parseJsonInput(queryJson, 'Query JSON');
            const parsedBody = parseJsonInput(bodyJson, 'Body JSON');
            const qs = parsedQuery ? assertObject(parsedQuery, 'Query JSON must parse to an object') : undefined;
            const body = parsedBody === undefined ? undefined : parsedBody;

            response = await requestAbsolute(
              this,
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
            );
          }
        }

        returnData.push({ json: normalizeResponse(response) });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
          });
          continue;
        }

        throw error;
      }
    }

    return [returnData];
  }
}
