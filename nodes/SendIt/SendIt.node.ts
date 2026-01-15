import {
  IExecuteFunctions,
  INodeExecutionData,
  INodeType,
  INodeTypeDescription,
  IHttpRequestMethods,
  IDataObject,
} from 'n8n-workflow';

export class SendIt implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SendIt',
    name: 'sendIt',
    icon: 'file:sendit.svg',
    group: ['transform'],
    version: 1,
    subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
    description: 'Multi-platform social media publishing',
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
      baseURL: 'https://sendit.infiniteappsai.com/api/v1',
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
          {
            name: 'Post',
            value: 'post',
          },
          {
            name: 'Scheduled Post',
            value: 'scheduledPost',
          },
          {
            name: 'Account',
            value: 'account',
          },
          {
            name: 'Validation',
            value: 'validation',
          },
        ],
        default: 'post',
      },
      // Post operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['post'],
          },
        },
        options: [
          {
            name: 'Publish',
            value: 'publish',
            description: 'Publish content to social media platforms immediately',
            action: 'Publish a post',
          },
        ],
        default: 'publish',
      },
      // Scheduled Post operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['scheduledPost'],
          },
        },
        options: [
          {
            name: 'Create',
            value: 'create',
            description: 'Schedule a post for future publishing',
            action: 'Schedule a post',
          },
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all scheduled posts',
            action: 'Get all scheduled posts',
          },
          {
            name: 'Delete',
            value: 'delete',
            description: 'Cancel a scheduled post',
            action: 'Cancel a scheduled post',
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
      // Account operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['account'],
          },
        },
        options: [
          {
            name: 'Get All',
            value: 'getAll',
            description: 'Get all connected accounts',
            action: 'Get all accounts',
          },
        ],
        default: 'getAll',
      },
      // Validation operations
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        noDataExpression: true,
        displayOptions: {
          show: {
            resource: ['validation'],
          },
        },
        options: [
          {
            name: 'Validate',
            value: 'validate',
            description: 'Validate content before publishing',
            action: 'Validate content',
          },
        ],
        default: 'validate',
      },
      // Platforms field
      {
        displayName: 'Platforms',
        name: 'platforms',
        type: 'multiOptions',
        options: [
          { name: 'LinkedIn', value: 'linkedin' },
          { name: 'Instagram', value: 'instagram' },
          { name: 'Threads', value: 'threads' },
          { name: 'TikTok', value: 'tiktok' },
          { name: 'X (Twitter)', value: 'x' },
        ],
        default: [],
        required: true,
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation'],
            operation: ['publish', 'create', 'validate'],
          },
        },
        description: 'Select platforms to publish to',
      },
      // Text content
      {
        displayName: 'Text',
        name: 'text',
        type: 'string',
        typeOptions: {
          rows: 4,
        },
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation'],
            operation: ['publish', 'create', 'validate'],
          },
        },
        description: 'The text content of your post',
      },
      // Media URL
      {
        displayName: 'Media URL',
        name: 'mediaUrl',
        type: 'string',
        default: '',
        displayOptions: {
          show: {
            resource: ['post', 'scheduledPost', 'validation'],
            operation: ['publish', 'create', 'validate'],
          },
        },
        description: 'URL to an image or video (required for Instagram and TikTok)',
      },
      // Scheduled Time
      {
        displayName: 'Scheduled Time',
        name: 'scheduledTime',
        type: 'dateTime',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['scheduledPost'],
            operation: ['create'],
          },
        },
        description: 'When to publish the post',
      },
      // Schedule ID
      {
        displayName: 'Schedule ID',
        name: 'scheduleId',
        type: 'string',
        default: '',
        required: true,
        displayOptions: {
          show: {
            resource: ['scheduledPost'],
            operation: ['delete', 'trigger'],
          },
        },
        description: 'The ID of the scheduled post',
      },
      // Platform filter
      {
        displayName: 'Platform Filter',
        name: 'platformFilter',
        type: 'options',
        options: [
          { name: 'All Platforms', value: '' },
          { name: 'LinkedIn', value: 'linkedin' },
          { name: 'Instagram', value: 'instagram' },
          { name: 'Threads', value: 'threads' },
          { name: 'TikTok', value: 'tiktok' },
          { name: 'X (Twitter)', value: 'x' },
        ],
        default: '',
        displayOptions: {
          show: {
            resource: ['scheduledPost'],
            operation: ['getAll'],
          },
        },
        description: 'Filter scheduled posts by platform',
      },
      // Additional options
      {
        displayName: 'Additional Options',
        name: 'additionalOptions',
        type: 'collection',
        placeholder: 'Add Option',
        default: {},
        displayOptions: {
          show: {
            resource: ['post', 'validation'],
            operation: ['publish', 'validate'],
          },
        },
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
        ],
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
        let response;

        if (resource === 'post') {
          if (operation === 'publish') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const additionalOptions = this.getNodeParameter('additionalOptions', i) as {
              mediaUrls?: string;
              mediaType?: string;
            };

            const body: Record<string, unknown> = {
              platforms,
              content: {
                text,
                mediaUrl: mediaUrl || undefined,
                mediaUrls: additionalOptions.mediaUrls
                  ? additionalOptions.mediaUrls.split(',').map((u) => u.trim())
                  : undefined,
                mediaType: additionalOptions.mediaType || 'auto',
              },
            };

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/publish',
                body,
              },
            );
          }
        } else if (resource === 'scheduledPost') {
          if (operation === 'create') {
            const platforms = this.getNodeParameter('platforms', i) as string[];
            const text = this.getNodeParameter('text', i) as string;
            const mediaUrl = this.getNodeParameter('mediaUrl', i) as string;
            const scheduledTime = this.getNodeParameter('scheduledTime', i) as string;

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
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
              },
            );
          } else if (operation === 'getAll') {
            const platformFilter = this.getNodeParameter('platformFilter', i) as string;
            const qs: Record<string, string> = {};
            if (platformFilter) {
              qs.platform = platformFilter;
            }

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/scheduled',
                qs,
              },
            );
          } else if (operation === 'delete') {
            const scheduleId = this.getNodeParameter('scheduleId', i) as string;

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'DELETE' as IHttpRequestMethods,
                url: `/scheduled/${scheduleId}`,
              },
            );
          } else if (operation === 'trigger') {
            const scheduleId = this.getNodeParameter('scheduleId', i) as string;

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'POST' as IHttpRequestMethods,
                url: `/scheduled/${scheduleId}/trigger`,
              },
            );
          }
        } else if (resource === 'account') {
          if (operation === 'getAll') {
            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'GET' as IHttpRequestMethods,
                url: '/accounts',
              },
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

            response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'POST' as IHttpRequestMethods,
                url: '/validate',
                body: {
                  platforms,
                  content: {
                    text,
                    mediaUrl: mediaUrl || undefined,
                    mediaUrls: additionalOptions.mediaUrls
                      ? additionalOptions.mediaUrls.split(',').map((u) => u.trim())
                      : undefined,
                    mediaType: additionalOptions.mediaType || 'auto',
                  },
                },
              },
            );
          }
        }

        returnData.push({
          json: response as IDataObject,
        });
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
