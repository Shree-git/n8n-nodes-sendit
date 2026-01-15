import {
  IHookFunctions,
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  IHttpRequestMethods,
} from 'n8n-workflow';

export class SendItTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SendIt Trigger',
    name: 'sendItTrigger',
    icon: 'file:sendit.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["event"]}}',
    description: 'Triggers when events occur in SendIt',
    defaults: {
      name: 'SendIt Trigger',
    },
    inputs: [],
    outputs: ['main'],
    credentials: [
      {
        name: 'sendItApi',
        required: true,
      },
    ],
    webhooks: [
      {
        name: 'default',
        httpMethod: 'POST',
        responseMode: 'onReceived',
        path: 'webhook',
      },
    ],
    properties: [
      {
        displayName: 'Event',
        name: 'event',
        type: 'options',
        options: [
          {
            name: 'Post Published',
            value: 'post.published',
            description: 'Triggered when a post is successfully published',
          },
          {
            name: 'Post Scheduled',
            value: 'post.scheduled',
            description: 'Triggered when a post is scheduled',
          },
          {
            name: 'Post Failed',
            value: 'post.failed',
            description: 'Triggered when a post fails to publish',
          },
          {
            name: 'Post Deleted',
            value: 'post.deleted',
            description: 'Triggered when a scheduled post is deleted',
          },
          {
            name: 'Account Connected',
            value: 'account.connected',
            description: 'Triggered when a social account is connected',
          },
          {
            name: 'Account Disconnected',
            value: 'account.disconnected',
            description: 'Triggered when a social account is disconnected',
          },
        ],
        default: 'post.published',
        required: true,
        description: 'The event to listen for',
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const webhookData = this.getWorkflowStaticData('node');

        // If we have stored webhook data, check if it still exists
        if (webhookData.webhookId) {
          try {
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'GET' as IHttpRequestMethods,
                url: `https://sendit.infiniteappsai.com/api/v1/webhooks/${webhookData.webhookId}`,
              },
            );
            if (response && (response as { webhook?: { url?: string } }).webhook?.url === webhookUrl) {
              return true;
            }
          } catch {
            // Webhook doesn't exist anymore
          }
        }
        return false;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const event = this.getNodeParameter('event') as string;
        const webhookData = this.getWorkflowStaticData('node');

        const body = {
          url: webhookUrl,
          events: [event],
        };

        const response = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'sendItApi',
          {
            method: 'POST' as IHttpRequestMethods,
            url: 'https://sendit.infiniteappsai.com/api/v1/webhooks',
            body,
          },
        );

        const webhookResponse = response as { webhook?: { id?: string; secret?: string } };
        if (webhookResponse.webhook?.id) {
          webhookData.webhookId = webhookResponse.webhook.id;
          webhookData.webhookSecret = webhookResponse.webhook.secret;
          return true;
        }

        return false;
      },

      async delete(this: IHookFunctions): Promise<boolean> {
        const webhookData = this.getWorkflowStaticData('node');

        if (webhookData.webhookId) {
          try {
            await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'DELETE' as IHttpRequestMethods,
                url: `https://sendit.infiniteappsai.com/api/v1/webhooks/${webhookData.webhookId}`,
              },
            );
          } catch {
            // Ignore errors during deletion
          }

          delete webhookData.webhookId;
          delete webhookData.webhookSecret;
        }

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const bodyData = this.getBodyData();

    return {
      workflowData: [
        this.helpers.returnJsonArray(bodyData),
      ],
    };
  }
}
