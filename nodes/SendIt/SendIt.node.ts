import {
  IExecuteFunctions,
  IHttpRequestMethods,
  ILoadOptionsFunctions,
  INodeExecutionData,
  INodePropertyOptions,
  INodeType,
  INodeTypeDescription,
  NodeConnectionTypes,
  NodeOperationError,
} from 'n8n-workflow';

import { SENDIT_API_BASE_URL, PLATFORM_OPTIONS } from './constants';
import { getOptionalString, buildOptionalHeaders, normalizeResponse } from './helpers';
import { RESOURCE_HANDLERS } from './handlers';

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
    inputs: [NodeConnectionTypes.Main],
    outputs: [NodeConnectionTypes.Main],
    credentials: [
      {
        name: 'sendItApi',
        required: true,
      },
    ],
    properties: [
      {
        displayName: 'Resource',
        name: 'resource',
        type: 'options',
        noDataExpression: true,
        options: [
          { name: 'Account', value: 'account' },
          { name: 'Advanced', value: 'advanced' },
          { name: 'AI', value: 'ai' },
          { name: 'AI Media', value: 'aiMedia' },
          { name: 'Analytics', value: 'analytics' },
          { name: 'Approval', value: 'approvals' },
          { name: 'Audit Log', value: 'auditLog' },
          { name: 'Brand Voice', value: 'brandVoice' },
          { name: 'Bulk Schedule', value: 'bulkSchedule' },
          { name: 'Campaign', value: 'campaign' },
          { name: 'Connect', value: 'connect' },
          { name: 'Content Score', value: 'contentScore' },
          { name: 'Conversion', value: 'conversions' },
          { name: 'Dead Letter', value: 'deadLetter' },
          { name: 'Inbox', value: 'inbox' },
          { name: 'Library', value: 'library' },
          { name: 'Listening', value: 'listening' },
          { name: 'Media', value: 'media' },
          { name: 'Meta', value: 'meta' },
          { name: 'Post', value: 'post' },
          { name: 'Scheduled Post', value: 'scheduledPost' },
          { name: 'Validation', value: 'validation' },
          { name: 'Webhook', value: 'webhooks' },
        ],
        default: 'post',
      },
      {
        displayName: 'Team ID',
        name: 'teamId',
        type: 'string',
        default: '',
        description: 'Optional team scope. Sent as X-Team-ID header when provided.',
      },
      {
        displayName: 'Idempotency Key',
        name: 'idempotencyKey',
        type: 'string',
        default: '',
        description: 'Optional idempotency key. Sent as Idempotency-Key header when provided.',
      },
      {
        displayName:
          'Publishing operations are rate-limited to 50 requests per minute per API key.',
        name: 'publishRateNotice',
        type: 'notice',
        default: '',
        displayOptions: { show: { resource: ['post'], operation: ['publish', 'publishAi'] } },
      },
      {
        displayName: 'AI content generation may take 5–15 seconds depending on prompt complexity.',
        name: 'aiGenerateNotice',
        type: 'notice',
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['generate'] } },
      },
      {
        displayName:
          'AI Media generation is asynchronous. This returns a job ID — use Get Status to poll for completion.',
        name: 'aiMediaAsyncNotice',
        type: 'notice',
        default: '',
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
      },
      {
        displayName: 'Campaign planning uses AI and may take 15–30 seconds for larger campaigns.',
        name: 'campaignPlanNotice',
        type: 'notice',
        default: '',
        displayOptions: { show: { resource: ['campaign'], operation: ['plan'] } },
      },
      {
        displayName:
          'Requeued posts will be retried with exponential backoff to the original target platforms.',
        name: 'deadLetterRequeueNotice',
        type: 'notice',
        default: '',
        displayOptions: { show: { resource: ['deadLetter'], operation: ['requeue'] } },
      },

      // ===== Operations by resource =====
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['post'] } },
        options: [
          {
            name: 'Publish',
            value: 'publish',
            description: 'Publish content to social media platforms immediately',
            action: 'Publish a post',
          },
          {
            name: 'Publish with AI',
            value: 'publishAi',
            description: 'Generate content with AI and publish to platforms',
            action: 'Publish with ai generated content',
          },
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
          {
            name: 'Feedback',
            value: 'feedback',
            description: 'Rate AI-generated content quality',
            action: 'Submit AI feedback',
          },
          {
            name: 'Generate Content',
            value: 'generate',
            description: 'Generate platform-specific content from media or prompt',
            action: 'Generate AI content',
          },
          {
            name: 'Mention Summary',
            value: 'mentionSummary',
            description: 'Generate an AI summary of recent mentions',
            action: 'Summarize mentions with AI',
          },
          {
            name: 'Reply Suggestions',
            value: 'replySuggestions',
            description: 'Get AI-drafted reply suggestions for a mention',
            action: 'Get AI reply suggestions',
          },
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
          {
            name: 'Upload',
            value: 'upload',
            description: 'Upload media file to get a URL',
            action: 'Upload media',
          },
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
          {
            name: 'Create',
            value: 'create',
            description: 'Schedule a post for future publishing',
            action: 'Schedule a post',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Cancel a scheduled post',
            action: 'Cancel a scheduled post',
          },
          {
            name: 'Get Many',
            value: 'getAll',
            description: 'Get many scheduled posts',
            action: 'Get many scheduled posts',
          },
          {
            name: 'Trigger Now',
            value: 'trigger',
            description: 'Publish a scheduled post immediately',
            action: 'Trigger scheduled post now',
          },
        ],
        default: 'create',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['account'] } },
        options: [
          {
            name: 'Get Many',
            value: 'getAll',
            description: 'Get many connected accounts',
            action: 'Get many accounts',
          },
        ],
        default: 'getAll',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['validation'] } },
        options: [
          {
            name: 'Validate',
            value: 'validate',
            description:
              'Validate content against platform rules before publishing (character limits, media requirements)',
            action: 'Validate content',
          },
        ],
        default: 'validate',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['analytics'] } },
        options: [
          {
            name: 'Get Analytics',
            value: 'getAnalytics',
            description: 'Get engagement analytics for posts on a platform',
            action: 'Get analytics for a platform',
          },
        ],
        default: 'getAnalytics',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['brandVoice'] } },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Create a new brand voice profile',
            action: 'Create a brand voice',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Delete a brand voice profile',
            action: 'Delete a brand voice',
          },
          {
            name: 'Get',
            value: 'get',
            description: 'Get a single brand voice profile',
            action: 'Get a brand voice',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List all brand voice profiles',
            action: 'List brand voices',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a brand voice profile',
            action: 'Update a brand voice',
          },
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
          {
            name: 'List',
            value: 'list',
            description: 'List all campaigns',
            action: 'List campaigns',
          },
          {
            name: 'Plan',
            value: 'plan',
            description: 'Create a new campaign with AI-planned posts',
            action: 'Plan a campaign',
          },
          {
            name: 'Schedule',
            value: 'schedule',
            description: 'Schedule all posts in a campaign',
            action: 'Schedule a campaign',
          },
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
          {
            name: 'Get Thread',
            value: 'getThread',
            description: 'Get a single inbox thread with messages',
            action: 'Get an inbox thread',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List inbox threads',
            action: 'List inbox threads',
          },
          {
            name: 'Reply',
            value: 'reply',
            description: 'Reply to an inbox thread',
            action: 'Reply to a thread',
          },
          {
            name: 'Update Status',
            value: 'updateStatus',
            description: 'Update thread status',
            action: 'Update inbox thread status',
          },
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
          {
            name: 'Archive Mentions',
            value: 'archiveMentions',
            action: 'Archive listening mentions',
          },
          {
            name: 'Create Keyword',
            value: 'createKeyword',
            description: 'Create a listening keyword',
            action: 'Create listening keyword',
          },
          {
            name: 'Delete Keyword',
            value: 'deleteKeyword',
            description: 'Delete listening keyword',
            action: 'Delete listening keyword',
          },
          {
            name: 'Dismiss Alerts',
            value: 'dismissAlerts',
            action: 'Dismiss listening alerts',
          },
          {
            name: 'Get Keyword',
            value: 'getKeyword',
            description: 'Get listening keyword by ID',
            action: 'Get listening keyword',
          },
          {
            name: 'Get Mention',
            value: 'getMention',
            description: 'Get mention by ID',
            action: 'Get listening mention',
          },
          {
            name: 'Get Summary',
            value: 'getSummary',
            description: 'Get listening summary',
            action: 'Get listening summary',
          },
          {
            name: 'List Alerts',
            value: 'listAlerts',
            description: 'List listening alerts',
            action: 'List listening alerts',
          },
          {
            name: 'List Keywords',
            value: 'listKeywords',
            description: 'List tracked listening keywords',
            action: 'List listening keywords',
          },
          {
            name: 'List Mentions',
            value: 'listMentions',
            action: 'List listening mentions',
          },
          {
            name: 'Mark Alerts Read',
            value: 'markAlertsRead',
            description: 'Mark alerts as read',
            action: 'Mark listening alerts as read',
          },
          {
            name: 'Mark Mentions Read',
            value: 'markMentionsRead',
            description: 'Mark mentions as read',
            action: 'Mark listening mentions as read',
          },
          {
            name: 'Refresh',
            value: 'refresh',
            description: 'Trigger a refresh of social listening data for tracked keywords',
            action: 'Refresh social listening data',
          },
          {
            name: 'Update Keyword',
            value: 'updateKeyword',
            description: 'Update listening keyword',
            action: 'Update listening keyword',
          },
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
          {
            name: 'Create',
            value: 'create',
            description: 'Generate AI media (image or video)',
            action: 'Create AI media',
          },
          {
            name: 'Get Status',
            value: 'getStatus',
            description: 'Get the status of an AI media generation job',
            action: 'Get AI media status',
          },
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
          {
            name: 'Get Best Times',
            value: 'getBestTimes',
            description: 'Get optimal posting times for a platform',
            action: 'Get best times to post',
          },
          {
            name: 'Get Capabilities',
            value: 'getCapabilities',
            description: 'Get supported platform capabilities',
            action: 'Get capabilities',
          },
          {
            name: 'Get Platform Settings Schema',
            value: 'getPlatformSettingsSchema',
            description: 'Get the settings schema for a platform',
            action: 'Get platform settings schema',
          },
          {
            name: 'Get Requirements',
            value: 'getRequirements',
            description: 'Get content requirements for a platform',
            action: 'Get platform requirements',
          },
          {
            name: 'Get Webhook Events Catalog',
            value: 'getWebhookEventsCatalog',
            description: 'Get all available webhook event types',
            action: 'Get webhook events catalog',
          },
          {
            name: 'Get Webhook Triggers',
            value: 'getWebhookTriggers',
            description: 'Get configured webhook trigger schemas',
            action: 'Get webhook triggers',
          },
        ],
        default: 'getCapabilities',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['contentScore'] } },
        options: [
          {
            name: 'Score',
            value: 'score',
            description: 'Score content quality across platforms',
            action: 'Score content quality',
          },
        ],
        default: 'score',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['library'] } },
        options: [
          { name: 'Create', value: 'create', action: 'Create library item' },
          { name: 'Delete', value: 'delete', action: 'Delete library item' },
          { name: 'Get', value: 'get', action: 'Get library item' },
          { name: 'List', value: 'list', action: 'List library items' },
          { name: 'List Categories', value: 'listCategories', action: 'List library categories' },
          { name: 'List Tags', value: 'listTags', action: 'List library tags' },
          { name: 'Update', value: 'update', action: 'Update library item' },
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
          { name: 'Approve', value: 'approve', action: 'Approve post' },
          { name: 'List', value: 'list', action: 'List approvals' },
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
          {
            name: 'Download Template',
            value: 'downloadTemplate',
            action: 'Download bulk schedule template',
          },
          { name: 'Get Import', value: 'getImport', action: 'Get bulk import' },
          { name: 'Import CSV', value: 'importCsv', action: 'Import CSV payload' },
          { name: 'List Imports', value: 'listImports', action: 'List bulk imports' },
          { name: 'Validate CSV', value: 'validateCsv', action: 'Validate CSV payload' },
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
          {
            name: 'Connect Token',
            value: 'connectToken',
            action: 'Connect with token credentials',
          },
          {
            name: 'Connect Webhook',
            value: 'connectWebhook',
            action: 'Connect with webhook credentials',
          },
          {
            name: 'Get Connect Action',
            value: 'getConnectAction',
            action: 'Get connect action for platform',
          },
        ],
        default: 'getConnectAction',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['webhooks'] } },
        options: [
          { name: 'Get', value: 'get', description: 'Get a webhook by ID', action: 'Get webhook' },
          {
            name: 'List',
            value: 'list',
            description: 'List all registered webhooks',
            action: 'List webhooks',
          },
          {
            name: 'Test Webhook',
            value: 'testWebhook',
            description: 'Send a test delivery to a webhook',
            action: 'Send a test webhook delivery',
          },
          {
            name: 'Update',
            value: 'update',
            description: 'Update a webhook subscription',
            action: 'Update webhook',
          },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['deadLetter'] } },
        options: [
          {
            name: 'Discard',
            value: 'discard',
            description: 'Permanently discard a dead letter post',
            action: 'Discard dead letter post',
          },
          {
            name: 'List',
            value: 'list',
            description: 'List posts in the dead letter queue',
            action: 'List dead letter posts',
          },
          {
            name: 'Requeue',
            value: 'requeue',
            description: 'Retry a failed post from the dead letter queue',
            action: 'Requeue dead letter post',
          },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['auditLog'] } },
        options: [
          {
            name: 'List',
            value: 'list',
            description: 'List audit log entries',
            action: 'List audit log entries',
          },
        ],
        default: 'list',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['conversions'] } },
        options: [
          {
            name: 'Track',
            value: 'track',
            description: 'Track a conversion event',
            action: 'Track conversion',
          },
        ],
        default: 'track',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: { show: { resource: ['advanced'] } },
        options: [
          {
            name: 'API Request',
            value: 'apiRequest',
            description: 'Send a custom API request to any SendIt v1/v2 endpoint',
            action: 'Run advanced API request',
          },
        ],
        default: 'apiRequest',
      },

      // ===== Shared publish / schedule fields =====
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
        description:
          'Select target platforms. Instagram and TikTok require media. Use Meta > Get Requirements to check platform-specific limits.',
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
        description:
          'The text content of your post. Character limits vary by platform — use Meta > Get Requirements to check.',
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
        description:
          'URL to an image or video. Required for Instagram, TikTok, and Pinterest. Optional for LinkedIn, X, Threads, and others.',
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
          },
        },
        description: 'Name of the binary property containing the file',
      },
      {
        displayName: 'AI Prompt',
        name: 'aiPrompt',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: {
          show: { resource: ['post', 'ai'], operation: ['publishAi', 'generate'] },
        },
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
        displayName: 'Scheduled Post Name or ID',
        name: 'scheduleId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getScheduledPosts' },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['scheduledPost'], operation: ['delete', 'trigger'] } },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
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
        displayName: 'Platform Name or ID',
        name: 'analyticsPlatform',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getConnectedPlatforms' },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['analytics'], operation: ['getAnalytics'] } },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: { resource: ['post', 'validation'], operation: ['publish', 'validate'] },
        },
        options: [
          {
            displayName: 'Facebook Mode',
            name: 'facebookMode',
            type: 'options',
            options: [
              { name: 'Auto (Try Reels First)', value: 'auto' },
              { name: 'Reel', value: 'reel' },
              { name: 'Feed Video', value: 'feed' },
            ],
            default: 'auto',
            description: 'How to publish videos to Facebook',
          },
          {
            displayName: 'Media Type',
            name: 'mediaType',
            type: 'options',
            options: [
              { name: 'Auto-Detect', value: 'auto' },
              { name: 'Image', value: 'image' },
              { name: 'Video', value: 'video' },
            ],
            default: 'auto',
            description: 'Specify the media type',
          },
          {
            displayName: 'Media URLs (for Carousel)',
            name: 'mediaUrls',
            type: 'string',
            default: '',
            description: 'Comma-separated URLs for carousel posts',
          },
          {
            displayName: 'Pinterest Board ID',
            name: 'pinterestBoardId',
            type: 'string',
            default: '',
            description: 'Pinterest board ID to pin to',
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
      {
        displayName: 'AI Options',
        name: 'aiOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: { resource: ['post', 'ai'], operation: ['publishAi', 'generate'] },
        },
        options: [
          {
            displayName: 'Call To Action',
            name: 'callToAction',
            type: 'string',
            default: '',
            description: 'Call-to-action to include in content',
          },
          {
            displayName: 'Facebook Mode',
            name: 'facebookMode',
            type: 'options',
            options: [
              { name: 'Auto (Try Reels First)', value: 'auto' },
              { name: 'Reel', value: 'reel' },
              { name: 'Feed Video', value: 'feed' },
            ],
            default: 'auto',
            description: 'How to publish videos to Facebook',
          },
          {
            displayName: 'Hashtags',
            name: 'hashtags',
            type: 'options',
            options: [
              { name: 'Platform Default', value: 'platform_auto' },
              { name: 'On (Include Hashtags)', value: 'on' },
              { name: 'Off (No Hashtags)', value: 'off' },
            ],
            default: 'platform_auto',
            description: 'Hashtag generation mode',
          },
          {
            displayName: 'Strict AI',
            name: 'strictAi',
            type: 'boolean',
            default: false,
            description: 'Whether to fail if AI generation fails (otherwise use fallback templates)',
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

      // ===== Pagination for list operations =====
      {
        displayName: 'Limit',
        name: 'accountLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['account'], operation: ['getAll'] } },
        description: 'Maximum number of accounts to return',
      },
      {
        displayName: 'Limit',
        name: 'campaignLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['campaign'], operation: ['list'] } },
        description: 'Maximum number of campaigns to return',
      },
      {
        displayName: 'Offset',
        name: 'campaignOffset',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['campaign'], operation: ['list'] } },
        description: 'Offset for pagination',
      },
      {
        displayName: 'Limit',
        name: 'approvalLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['approvals'], operation: ['list'] } },
        description: 'Maximum number of approvals to return',
      },
      {
        displayName: 'Offset',
        name: 'approvalOffset',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['approvals'], operation: ['list'] } },
        description: 'Offset for pagination',
      },
      {
        displayName: 'Limit',
        name: 'brandVoiceLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['brandVoice'], operation: ['list'] } },
        description: 'Maximum number of brand voices to return',
      },

      // ===== Brand voice fields =====
      {
        displayName: 'Brand Voice Name or ID',
        name: 'brandVoiceId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getBrandVoices' },
        default: '',
        required: true,
        displayOptions: {
          show: { resource: ['brandVoice'], operation: ['get', 'update', 'delete'] },
        },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Voice Name',
        name: 'brandVoiceName',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Name for the brand voice profile',
      },
      {
        displayName: 'Voice Description',
        name: 'brandVoiceDescription',
        type: 'string',
        typeOptions: { rows: 3 },
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Description of the brand voice',
      },
      {
        displayName: 'Tone',
        name: 'brandVoiceTone',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Tone of voice (e.g. professional, casual, witty)',
      },
      {
        displayName: 'Vocabulary',
        name: 'brandVoiceVocabulary',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Comma-separated preferred vocabulary words',
      },
      {
        displayName: 'Banned Words',
        name: 'brandVoiceBannedWords',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Comma-separated words to avoid',
      },
      {
        displayName: 'Is Default',
        name: 'brandVoiceIsDefault',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['brandVoice'], operation: ['create', 'update'] } },
        description: 'Whether this is the default brand voice',
      },

      // ===== Campaign fields =====
      {
        displayName: 'Campaign Objective',
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
        displayName: 'Campaign Brief',
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
        displayName: 'Campaign Name or ID',
        name: 'campaignId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getCampaigns' },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['campaign'], operation: ['schedule'] } },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },

      // ===== Inbox fields =====
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
          { name: 'Archived', value: 'archived' },
          { name: 'Closed', value: 'closed' },
          { name: 'Open', value: 'open' },
          { name: 'Replied', value: 'replied' },
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
        displayName: 'Inbox Thread Name or ID',
        name: 'inboxThreadId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getInboxThreads' },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['inbox'],
            operation: ['reply', 'getThread', 'updateStatus'],
          },
        },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Reply Message',
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
          { name: 'Archived', value: 'archived' },
          { name: 'Closed', value: 'closed' },
          { name: 'Open', value: 'open' },
          { name: 'Replied', value: 'replied' },
        ],
        default: 'open',
        required: true,
        displayOptions: { show: { resource: ['inbox'], operation: ['updateStatus'] } },
        description: 'Updated status for thread',
      },

      // ===== Listening fields =====
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
        displayOptions: { show: { resource: ['listening'], operation: ['refresh'] } },
        description: 'Comma-separated keyword IDs to refresh',
      },
      {
        displayName: 'Listening Keyword Name or ID',
        name: 'listeningKeywordId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getListeningKeywords' },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['getKeyword', 'updateKeyword', 'deleteKeyword'],
          },
        },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Keyword',
        name: 'listeningKeyword',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['listening'], operation: ['createKeyword'] } },
        description: 'Keyword text to monitor',
      },
      {
        displayName: 'Keyword Type',
        name: 'listeningKeywordType',
        type: 'options',
        options: [
          { name: 'Brand', value: 'brand' },
          { name: 'Competitor', value: 'competitor' },
          { name: 'Custom', value: 'custom' },
          { name: 'Hashtag', value: 'hashtag' },
          { name: 'Product', value: 'product' },
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
        description: 'Whether to only include active keywords',
      },
      {
        displayName: 'Notify Email',
        name: 'listeningNotifyEmail',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] },
        },
        description: 'Whether to enable email notifications',
      },
      {
        displayName: 'Notify Webhook',
        name: 'listeningNotifyWebhook',
        type: 'boolean',
        default: false,
        displayOptions: {
          show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] },
        },
        description: 'Whether to enable webhook notifications',
      },
      {
        displayName: 'Webhook URL',
        name: 'listeningWebhookUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['listening'], operation: ['createKeyword', 'updateKeyword'] },
        },
        description: 'Webhook URL for notifications',
      },
      {
        displayName: 'Sentiment Filter',
        name: 'listeningSentimentFilter',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Negative', value: 'negative' },
          { name: 'Neutral', value: 'neutral' },
          { name: 'Positive', value: 'positive' },
        ],
        default: '',
        displayOptions: {
          show: {
            resource: ['listening'],
            operation: ['createKeyword', 'updateKeyword', 'listMentions'],
          },
        },
      },
      {
        displayName: 'Mention ID',
        name: 'listeningMentionId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['listening'], operation: ['getMention'] } },
      },
      {
        displayName: 'Mention IDs',
        name: 'listeningMentionIds',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: { resource: ['listening'], operation: ['markMentionsRead', 'archiveMentions'] },
        },
        description: 'Comma-separated mention IDs',
      },
      {
        displayName: 'Alerts Unread Only',
        name: 'listeningAlertsUnreadOnly',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['listening'], operation: ['listAlerts'] } },
        description: 'Whether to only include unread alerts',
      },
      {
        displayName: 'Alert Priority',
        name: 'listeningAlertPriority',
        type: 'options',
        options: [
          { name: 'Any', value: '' },
          { name: 'Critical', value: 'critical' },
          { name: 'High', value: 'high' },
          { name: 'Low', value: 'low' },
          { name: 'Medium', value: 'medium' },
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
        displayOptions: {
          show: { resource: ['listening'], operation: ['listMentions', 'listAlerts'] },
        },
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
          { name: 'Active', value: 'false' },
          { name: 'Any', value: '' },
          { name: 'Archived', value: 'true' },
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
        displayOptions: {
          show: { resource: ['listening'], operation: ['markAlertsRead', 'dismissAlerts'] },
        },
        description: 'Comma-separated alert IDs',
      },

      // ===== AI Media fields =====
      {
        displayName: 'Provider',
        name: 'aiMediaProvider',
        type: 'options',
        options: [
          { name: 'Adobe Express', value: 'adobe-express' },
          { name: 'Pika', value: 'pika' },
          { name: 'Runway', value: 'runway' },
          { name: 'Sora', value: 'sora' },
        ],
        default: 'sora',
        required: true,
        displayOptions: { show: { resource: ['aiMedia'], operation: ['create'] } },
        description: 'AI media generation provider',
      },
      {
        displayName: 'Generation Prompt',
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

      // ===== Meta fields =====
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
        displayOptions: { show: { resource: ['meta'], operation: ['getBestTimes'] } },
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
        displayName: 'Library Item Name or ID',
        name: 'libraryItemId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getLibraryItems' },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['library'], operation: ['get', 'update', 'delete'] } },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Title',
        name: 'libraryTitle',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['library'], operation: ['create', 'update'] } },
        description: 'Library item title',
      },
      {
        displayName: 'Body Text',
        name: 'libraryText',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['library'], operation: ['create', 'update'] } },
        description: 'Library item text body',
      },
      {
        displayName: 'Library Type',
        name: 'libraryType',
        type: 'options',
        options: [
          { name: 'Draft', value: 'draft' },
          { name: 'Evergreen', value: 'evergreen' },
          { name: 'Template', value: 'template' },
        ],
        default: 'draft',
        displayOptions: {
          show: { resource: ['library'], operation: ['list', 'create', 'update'] },
        },
        description: 'Library content type',
      },
      {
        displayName: 'Category',
        name: 'libraryCategory',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['library'], operation: ['list', 'create', 'update'] },
        },
        description: 'Library category',
      },
      {
        displayName: 'Tags',
        name: 'libraryTags',
        type: 'string',
        default: '',
        displayOptions: {
          show: { resource: ['library'], operation: ['list', 'create', 'update'] },
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
          show: { resource: ['library'], operation: ['list', 'create', 'update'] },
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
        displayOptions: { show: { resource: ['library'], operation: ['create', 'update'] } },
        description: 'Whether to enable evergreen republishing',
      },
      {
        displayName: 'Evergreen Interval Days',
        name: 'libraryEvergreenIntervalDays',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['library'], operation: ['create', 'update'] } },
        description: 'Optional evergreen interval days',
      },
      {
        displayName: 'Evergreen Max Publishes',
        name: 'libraryEvergreenMaxPublishes',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['library'], operation: ['create', 'update'] } },
        description: 'Optional max evergreen publish count',
      },

      // ===== Approvals fields =====
      {
        displayName: 'Approval Post ID',
        name: 'approvalPostId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['approvals'], operation: ['approve', 'reject'] } },
        description: 'Scheduled post ID in approvals queue',
      },
      {
        displayName: 'Approval Comment',
        name: 'approvalComment',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['approvals'], operation: ['approve'] } },
        description: 'Optional approval comment',
      },
      {
        displayName: 'Rejection Reason',
        name: 'approvalReason',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['approvals'], operation: ['reject'] } },
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
          show: { resource: ['bulkSchedule'], operation: ['validateCsv', 'importCsv'] },
        },
        description: 'Raw CSV string payload',
      },
      {
        displayName: 'Filename',
        name: 'bulkFilename',
        type: 'string',
        default: 'upload.csv',
        displayOptions: {
          show: { resource: ['bulkSchedule'], operation: ['validateCsv', 'importCsv'] },
        },
        description: 'CSV filename for import metadata',
      },
      {
        displayName: 'Skip Errors',
        name: 'bulkSkipErrors',
        type: 'boolean',
        default: false,
        displayOptions: { show: { resource: ['bulkSchedule'], operation: ['importCsv'] } },
        description: 'Whether to continue import even if some rows fail validation',
      },

      // ===== Connect fields =====
      {
        displayName: 'Connect Platform',
        name: 'connectPlatform',
        type: 'options',
        options: PLATFORM_OPTIONS,
        default: 'linkedin',
        required: true,
        displayOptions: {
          show: {
            resource: ['connect'],
            operation: ['getConnectAction', 'connectToken', 'connectWebhook'],
          },
        },
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

      // ===== Webhook fields =====
      {
        displayName: 'Webhook Name or ID',
        name: 'webhookId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getWebhooks' },
        default: '',
        required: true,
        displayOptions: {
          show: { resource: ['webhooks'], operation: ['get', 'update', 'testWebhook'] },
        },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },
      {
        displayName: 'Webhook URL',
        name: 'webhookUpdateUrl',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['webhooks'], operation: ['update'] } },
        description: 'New URL for the webhook endpoint',
      },
      {
        displayName: 'Webhook Events',
        name: 'webhookUpdateEvents',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['webhooks'], operation: ['update'] } },
        description: 'Comma-separated event types to subscribe to',
      },
      {
        displayName: 'Active',
        name: 'webhookUpdateActive',
        type: 'boolean',
        default: true,
        displayOptions: { show: { resource: ['webhooks'], operation: ['update'] } },
        description: 'Whether the webhook subscription is active',
      },

      // ===== Dead letter fields =====
      {
        displayName: 'Status Filter',
        name: 'deadLetterStatus',
        type: 'options',
        options: [
          { name: 'All Statuses', value: '' },
          { name: 'Dead', value: 'dead' },
          { name: 'Discarded', value: 'discarded' },
          { name: 'Requeued', value: 'requeued' },
        ],
        default: '',
        displayOptions: { show: { resource: ['deadLetter'], operation: ['list'] } },
        description: 'Filter dead letter posts by status',
      },
      {
        displayName: 'Limit',
        name: 'deadLetterLimit',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 100 },
        default: 50,
        displayOptions: { show: { resource: ['deadLetter'], operation: ['list'] } },
        description: 'Maximum number of dead letter posts to return',
      },
      {
        displayName: 'Dead Letter Post Name or ID',
        name: 'deadLetterId',
        type: 'options',
        typeOptions: { loadOptionsMethod: 'getDeadLetterPosts' },
        default: '',
        required: true,
        displayOptions: { show: { resource: ['deadLetter'], operation: ['requeue', 'discard'] } },
        description: 'Choose from the list, or specify an ID using an expression. Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>.',
      },

      // ===== Audit log fields =====
      {
        displayName: 'Action Filter',
        name: 'auditAction',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Filter by audit action type',
      },
      {
        displayName: 'Resource Type Filter',
        name: 'auditResourceType',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Filter by resource type',
      },
      {
        displayName: 'Start Date',
        name: 'auditStartDate',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Filter entries from this date',
      },
      {
        displayName: 'End Date',
        name: 'auditEndDate',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Filter entries until this date',
      },
      {
        displayName: 'Limit',
        name: 'auditLimit',
        type: 'number',
        default: 50,
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Maximum number of audit log entries to return',
      },
      {
        displayName: 'Offset',
        name: 'auditOffset',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['auditLog'], operation: ['list'] } },
        description: 'Offset for pagination',
      },

      // ===== Conversions fields =====
      {
        displayName: 'Tracked Link ID',
        name: 'conversionTrackedLinkId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['conversions'], operation: ['track'] } },
        description: 'Tracked link ID for the conversion',
      },
      {
        displayName: 'Short Code',
        name: 'conversionShortCode',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['conversions'], operation: ['track'] } },
        description: 'Short code for the tracked link',
      },
      {
        displayName: 'Conversion Type',
        name: 'conversionType',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['conversions'], operation: ['track'] } },
        description: 'Type of conversion (e.g. signup, purchase)',
      },
      {
        displayName: 'Value',
        name: 'conversionValue',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['conversions'], operation: ['track'] } },
        description: 'Monetary value of the conversion',
      },
      {
        displayName: 'Metadata JSON',
        name: 'conversionMetadataJson',
        type: 'string',
        typeOptions: { rows: 4 },
        default: '',
        displayOptions: { show: { resource: ['conversions'], operation: ['track'] } },
        description: 'Optional JSON metadata for the conversion',
      },

      // ===== AI auxiliary fields =====
      {
        displayName: 'Mention ID',
        name: 'aiMentionId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['ai'], operation: ['replySuggestions'] } },
        description: 'The mention ID to generate reply suggestions for',
      },
      {
        displayName: 'Tone',
        name: 'aiTone',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['replySuggestions'] } },
        description: 'Optional tone for reply suggestions',
      },
      {
        displayName: 'Max Length',
        name: 'aiMaxLength',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['ai'], operation: ['replySuggestions'] } },
        description: 'Maximum character length for suggestions',
      },
      {
        displayName: 'Since',
        name: 'aiSummarySince',
        type: 'dateTime',
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['mentionSummary'] } },
        description: 'Summarize mentions since this timestamp',
      },
      {
        displayName: 'Platform',
        name: 'aiSummaryPlatform',
        type: 'options',
        options: [{ name: 'All', value: '' }, ...PLATFORM_OPTIONS],
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['mentionSummary'] } },
        description: 'Filter mentions by platform for summary',
      },
      {
        displayName: 'Keyword ID',
        name: 'aiSummaryKeywordId',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['mentionSummary'] } },
        description: 'Filter mentions by keyword ID for summary',
      },
      {
        displayName: 'Summary Limit',
        name: 'aiSummaryLimit',
        type: 'number',
        default: 0,
        displayOptions: { show: { resource: ['ai'], operation: ['mentionSummary'] } },
        description: 'Maximum mentions to include in summary',
      },
      {
        displayName: 'Log ID',
        name: 'aiLogId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: { show: { resource: ['ai'], operation: ['feedback'] } },
        description: 'AI generation log ID to rate',
      },
      {
        displayName: 'Rating',
        name: 'aiRating',
        type: 'number',
        typeOptions: { minValue: 1, maxValue: 5 },
        default: 3,
        required: true,
        displayOptions: { show: { resource: ['ai'], operation: ['feedback'] } },
        description: 'Rating from 1 (poor) to 5 (excellent)',
      },
      {
        displayName: 'Notes',
        name: 'aiNotes',
        type: 'string',
        default: '',
        displayOptions: { show: { resource: ['ai'], operation: ['feedback'] } },
        description: 'Optional feedback notes',
      },

      // ===== Advanced fields =====
      {
        displayName: 'Method',
        name: 'advancedMethod',
        type: 'options',
        options: [
          { name: 'DELETE', value: 'DELETE' },
          { name: 'GET', value: 'GET' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
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
          { name: 'Binary', value: 'binary' },
          { name: 'JSON', value: 'json' },
          { name: 'Text', value: 'text' },
        ],
        default: 'json',
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'How to decode the response payload',
      },
      {
        displayName: 'Request Timeout (Ms)',
        name: 'requestTimeoutMs',
        type: 'number',
        default: 30000,
        displayOptions: { show: { resource: ['advanced'], operation: ['apiRequest'] } },
        description: 'Request timeout in milliseconds',
      },
    ],
		usableAsTool: true,
  };

  methods = {
    loadOptions: {
      async getBrandVoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/brand-voice',
          qs: { limit: 100 },
        });
        return (
          ((response as Record<string, unknown>)?.profiles as Array<Record<string, unknown>>) ?? []
        ).map((p) => ({
          name: String(p.name || p.id),
          value: String(p.id),
        }));
      },
      async getCampaigns(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/campaigns',
          qs: { limit: 100 },
        });
        return (
          ((response as Record<string, unknown>)?.campaigns as Array<Record<string, unknown>>) ?? []
        ).map((c) => ({
          name: String(c.name || c.id),
          value: String(c.id),
        }));
      },
      async getScheduledPosts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/scheduled',
        });
        return (
          ((response as Record<string, unknown>)?.posts as Array<Record<string, unknown>>) ?? []
        ).map((s) => ({
          name: String((s.content as Record<string, unknown>)?.text || s.id).substring(0, 60),
          value: String(s.id),
        }));
      },
      async getWebhooks(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/webhooks',
        });
        return (
          ((response as Record<string, unknown>)?.webhooks as Array<Record<string, unknown>>) ?? []
        ).map((w) => ({
          name: `${String(w.url || w.id).substring(0, 50)} (${((w.events as string[]) ?? []).join(', ')})`,
          value: String(w.id),
        }));
      },
      async getLibraryItems(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/library',
          qs: { limit: 100 },
        });
        return (
          ((response as Record<string, unknown>)?.items as Array<Record<string, unknown>>) ?? []
        ).map((item) => ({
          name: String(item.title || item.id),
          value: String(item.id),
        }));
      },
      async getListeningKeywords(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/listening/keywords',
        });
        return (
          ((response as Record<string, unknown>)?.keywords as Array<Record<string, unknown>>) ?? []
        ).map((k) => ({
          name: `${String(k.keyword)} (${String(k.type || 'custom')})`,
          value: String(k.id),
        }));
      },
      async getConnectedPlatforms(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/accounts',
          qs: { limit: 100 },
        });
        const seen = new Set<string>();
        return (
          ((response as Record<string, unknown>)?.accounts as Array<Record<string, unknown>>) ?? []
        )
          .filter((a) => {
            const p = String(a.platform);
            if (seen.has(p)) return false;
            seen.add(p);
            return true;
          })
          .map((a) => ({
            name: String(a.platform).charAt(0).toUpperCase() + String(a.platform).slice(1),
            value: String(a.platform),
          }));
      },
      async getDeadLetterPosts(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/dead-letter',
          qs: { limit: 50 },
        });
        return (
          ((response as Record<string, unknown>)?.posts as Array<Record<string, unknown>>) ?? []
        ).map((dl) => ({
          name: `${String(dl.id)} — ${((dl.platforms as string[]) ?? []).join(', ')}`,
          value: String(dl.id),
        }));
      },
      async getInboxThreads(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
        const response = await this.helpers.httpRequestWithAuthentication.call(this, 'sendItApi', {
          method: 'GET' as IHttpRequestMethods,
          baseURL: SENDIT_API_BASE_URL,
          url: '/inbox',
          qs: { limit: 50 },
        });
        return (
          ((response as Record<string, unknown>)?.threads as Array<Record<string, unknown>>) ?? []
        ).map((t) => ({
          name: `${String(t.platform || 'unknown')} — ${String(t.id)}`,
          value: String(t.id),
        }));
      },
    },
  };

  async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
    const items = this.getInputData();
    const returnData: INodeExecutionData[] = [];
    const resource = this.getNodeParameter('resource', 0) as string;
    const operation = this.getNodeParameter('operation', 0) as string;

    for (let i = 0; i < items.length; i++) {
      try {
        const teamId = getOptionalString(this.getNodeParameter('teamId', i) as string);
        const idempotencyKey = getOptionalString(
          this.getNodeParameter('idempotencyKey', i) as string
        );
        const optionalHeaders = buildOptionalHeaders(teamId, idempotencyKey);

        const handler = RESOURCE_HANDLERS[resource];
        if (!handler) {
          throw new NodeOperationError(this.getNode(), `Unknown resource: ${resource}`);
        }

        const response = await handler(this, operation, i, optionalHeaders);
        returnData.push({ json: normalizeResponse(response), pairedItem: { item: i } });
      } catch (error) {
        if (this.continueOnFail()) {
          returnData.push({
            json: {
              error: (error as Error).message,
            },
            pairedItem: { item: i },
          });
          continue;
        }

        const message = error instanceof Error ? error.message : 'SendIt operation failed';
        throw new NodeOperationError(this.getNode(), message);
      }
    }

    return [returnData];
  }
}
