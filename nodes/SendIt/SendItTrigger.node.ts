import {
  IHookFunctions,
  IWebhookFunctions,
  INodeType,
  INodeTypeDescription,
  IWebhookResponseData,
  IHttpRequestMethods,
  NodeOperationError,
} from 'n8n-workflow';
import crypto from 'crypto';

const SENDIT_API_BASE_URL = 'https://sendit.infiniteappsai.com/api/v1';
const SIGNATURE_TOLERANCE_SECONDS = 300;

function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const parts = signature.split(',');
    const timestampPart = parts.find((p) => p.startsWith('t='));
    const signaturePart = parts.find((p) => p.startsWith('v1='));

    if (!timestampPart || !signaturePart) {
      return false;
    }

    const timestamp = parseInt(timestampPart.substring(2), 10);
    const expectedSignature = signaturePart.substring(3);

    const now = Math.floor(Date.now() / 1000);
    if (Math.abs(now - timestamp) > SIGNATURE_TOLERANCE_SECONDS) {
      return false;
    }

    const signedPayload = `${timestamp}.${payload}`;
    const computedSignature = crypto
      .createHmac('sha256', secret)
      .update(signedPayload)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'hex');
    const computedBuf = Buffer.from(computedSignature, 'hex');

    if (expectedBuf.length !== computedBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, computedBuf);
  } catch {
    return false;
  }
}

const EVENT_OPTIONS = [
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
    name: 'Post Dead Lettered',
    value: 'post.dead_lettered',
    description: 'Triggered when a post is moved to dead letter queue',
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
  {
    name: 'Mention Detected',
    value: 'mention.detected',
    description: 'Triggered when a monitored mention is detected',
  },
  {
    name: 'Mention Negative Sentiment',
    value: 'mention.negative_sentiment',
    description: 'Triggered when negative sentiment is detected',
  },
  {
    name: 'Team Member Joined',
    value: 'team.member_joined',
    description: 'Triggered when a member joins a team',
  },
  {
    name: 'Team Member Left',
    value: 'team.member_left',
    description: 'Triggered when a member leaves a team',
  },
  {
    name: 'Team Member Role Changed',
    value: 'team.member_role_changed',
    description: 'Triggered when a team member role changes',
  },
  {
    name: 'Team Invitation Sent',
    value: 'team.invitation_sent',
    description: 'Triggered when a team invitation is sent',
  },
  {
    name: 'Team Invitation Accepted',
    value: 'team.invitation_accepted',
    description: 'Triggered when a team invitation is accepted',
  },
  {
    name: 'Team Invitation Declined',
    value: 'team.invitation_declined',
    description: 'Triggered when a team invitation is declined',
  },
  {
    name: 'Approval Submitted',
    value: 'approval.submitted',
    description: 'Triggered when approval workflow starts',
  },
  {
    name: 'Approval Step Approved',
    value: 'approval.step_approved',
    description: 'Triggered when an approval step is approved',
  },
  {
    name: 'Approval Request Changes',
    value: 'approval.request_changes',
    description: 'Triggered when approval requests changes',
  },
  {
    name: 'Approval Rejected',
    value: 'approval.rejected',
    description: 'Triggered when approval is rejected',
  },
  {
    name: 'Analytics Anomaly Detected',
    value: 'analytics.anomaly_detected',
    description: 'Triggered when analytics anomaly is detected',
  },
  {
    name: 'Account Token Expiring',
    value: 'account.token_expiring',
    description: 'Triggered when account token is near expiry',
  },
  {
    name: 'Account Token Refresh Failed',
    value: 'account.token_refresh_failed',
    description: 'Triggered when account token refresh fails',
  },
  {
    name: 'Account Reconnect Required',
    value: 'account.reconnect_required',
    description: 'Triggered when reconnect is required',
  },
  {
    name: 'Account Refresh Recovered',
    value: 'account.refresh_recovered',
    description: 'Triggered when account refresh recovers',
  },
  {
    name: 'Account Auth Recovery Completed',
    value: 'account.auth_recovery_completed',
    description: 'Triggered when auth recovery completes',
  },
  {
    name: 'Security API Key Rotation Due',
    value: 'security.api_key_rotation_due',
    description: 'Triggered when API key rotation is due',
  },
  {
    name: 'Audit Critical',
    value: 'audit.critical',
    description: 'Triggered on critical audit events',
  },
];

export class SendItTrigger implements INodeType {
  description: INodeTypeDescription = {
    displayName: 'SendIt Trigger',
    name: 'sendItTrigger',
    icon: 'file:sendit.svg',
    group: ['trigger'],
    version: 1,
    subtitle: '={{$parameter["customEvent"] || ($parameter["event"] || []).join(", ")}}',
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
        displayName: 'Events',
        name: 'event',
        type: 'multiOptions',
        options: EVENT_OPTIONS,
        default: ['post.published'],
        required: true,
        description: 'The catalog events to listen for',
      },
      {
        displayName: 'Custom Event',
        name: 'customEvent',
        type: 'string',
        default: '',
        description: 'Optional custom event string that overrides Event if set',
      },
    ],
  };

  webhookMethods = {
    default: {
      async checkExists(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const webhookData = this.getWorkflowStaticData('node');

        if (webhookData.webhookId) {
          try {
            const response = await this.helpers.httpRequestWithAuthentication.call(
              this,
              'sendItApi',
              {
                method: 'GET' as IHttpRequestMethods,
                baseURL: SENDIT_API_BASE_URL,
                url: `/webhooks/${webhookData.webhookId}`,
              },
            );

            if (response && (response as { webhook?: { url?: string } }).webhook?.url === webhookUrl) {
              return true;
            }
          } catch {
            // Webhook does not exist anymore.
          }
        }

        return false;
      },

      async create(this: IHookFunctions): Promise<boolean> {
        const webhookUrl = this.getNodeWebhookUrl('default');
        const selectedEvents = this.getNodeParameter('event') as string[];
        const customEvent = this.getNodeParameter('customEvent') as string;
        const webhookData = this.getWorkflowStaticData('node');

        const response = await this.helpers.httpRequestWithAuthentication.call(
          this,
          'sendItApi',
          {
            method: 'POST' as IHttpRequestMethods,
            baseURL: SENDIT_API_BASE_URL,
            url: '/webhooks',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url: webhookUrl,
              events: customEvent.trim().length > 0 ? [customEvent.trim()] : selectedEvents,
            }),
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
                baseURL: SENDIT_API_BASE_URL,
                url: `/webhooks/${webhookData.webhookId}`,
              },
            );
          } catch {
            // Ignore deletion errors.
          }

          delete webhookData.webhookId;
          delete webhookData.webhookSecret;
        }

        return true;
      },
    },
  };

  async webhook(this: IWebhookFunctions): Promise<IWebhookResponseData> {
    const req = this.getRequestObject();
    const webhookData = this.getWorkflowStaticData('node');
    const secret = webhookData.webhookSecret as string | undefined;

    const signature = req.headers['x-sendit-signature'] as string | undefined;
    const bodyData = this.getBodyData();
    const rawBody = typeof req.rawBody === 'string'
      ? req.rawBody
      : Buffer.isBuffer(req.rawBody)
        ? req.rawBody.toString('utf8')
        : JSON.stringify(bodyData);

    if (secret) {
      if (!signature) {
        throw new NodeOperationError(
          this.getNode(),
          'Missing X-SendIt-Signature header. Webhook request rejected.',
        );
      }

      const isValid = verifyWebhookSignature(rawBody, signature, secret);
      if (!isValid) {
        throw new NodeOperationError(
          this.getNode(),
          'Invalid webhook signature. Request may be tampered with or expired.',
        );
      }
    }

    return {
      workflowData: [this.helpers.returnJsonArray(bodyData)],
    };
  }
}
