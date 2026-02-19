import crypto from 'node:crypto';
import { describe, expect, it, vi } from 'vitest';
import { NodeOperationError } from 'n8n-workflow';
import { SendItTrigger } from '../nodes/SendIt/SendItTrigger.node';

interface TriggerHarnessOptions {
  secret?: string;
  headers?: Record<string, string | undefined>;
  body?: Record<string, unknown>;
}

function createSignature(secret: string, body: Record<string, unknown>, timestamp: number): string {
  const payload = JSON.stringify(body);
  const digest = crypto.createHmac('sha256', secret).update(`${timestamp}.${payload}`).digest('hex');
  return `t=${timestamp},v1=${digest}`;
}

function createWebhookHarness(options: TriggerHarnessOptions = {}) {
  const body = options.body ?? { event: 'post.published', postId: 'post_1' };
  const webhookData: Record<string, unknown> = {};

  if (options.secret) {
    webhookData.webhookSecret = options.secret;
  }

  const returnJsonArray = vi.fn((input: unknown) => [{ json: input }]);

  const context = {
    getRequestObject: () => ({ headers: options.headers ?? {} }),
    getWorkflowStaticData: () => webhookData,
    getBodyData: () => body,
    getNode: () => ({ name: 'SendIt Trigger', type: 'sendItTrigger' }),
    helpers: {
      returnJsonArray,
    },
  };

  return {
    returnJsonArray,
    run: async () => {
      const node = new SendItTrigger();
      return node.webhook.call(context as never);
    },
  };
}

describe('SendIt trigger registration', () => {
  it('registers selected catalog event', async () => {
    const webhookData: Record<string, unknown> = {};
    const httpRequestWithAuthentication = vi.fn(async () => ({
      webhook: {
        id: 'wh_123',
        secret: 'whsec_123',
      },
    }));

    const context = {
      getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/123',
      getNodeParameter: (name: string) => {
        if (name === 'event') return 'approval.submitted';
        if (name === 'customEvent') return '';
        return undefined;
      },
      getWorkflowStaticData: () => webhookData,
      helpers: {
        httpRequestWithAuthentication,
      },
    };

    const node = new SendItTrigger();
    const created = await node.webhookMethods.default.create.call(context as never);

    expect(created).toBe(true);
    expect(webhookData).toMatchObject({ webhookId: 'wh_123', webhookSecret: 'whsec_123' });

    const request = httpRequestWithAuthentication.mock.calls[0][1] as Record<string, unknown>;
    expect(request).toMatchObject({ method: 'POST', url: '/webhooks' });
    expect(JSON.parse(request.body as string)).toEqual({
      url: 'https://n8n.example.com/webhook/123',
      events: ['approval.submitted'],
    });
  });

  it('uses customEvent override when provided', async () => {
    const httpRequestWithAuthentication = vi.fn(async () => ({
      webhook: {
        id: 'wh_456',
        secret: 'whsec_456',
      },
    }));

    const context = {
      getNodeWebhookUrl: () => 'https://n8n.example.com/webhook/456',
      getNodeParameter: (name: string) => {
        if (name === 'event') return 'post.failed';
        if (name === 'customEvent') return 'security.api_key_rotation_due';
        return undefined;
      },
      getWorkflowStaticData: () => ({}),
      helpers: {
        httpRequestWithAuthentication,
      },
    };

    const node = new SendItTrigger();
    const created = await node.webhookMethods.default.create.call(context as never);

    expect(created).toBe(true);
    const request = httpRequestWithAuthentication.mock.calls[0][1] as Record<string, unknown>;
    expect(JSON.parse(request.body as string)).toEqual({
      url: 'https://n8n.example.com/webhook/456',
      events: ['security.api_key_rotation_due'],
    });
  });
});

describe('SendIt trigger signature verification', () => {
  it('accepts a valid signature', async () => {
    const secret = 'whsec_test_secret';
    const body = { event: 'post.published', postId: 'post_123' };
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = createSignature(secret, body, timestamp);

    const harness = createWebhookHarness({
      secret,
      body,
      headers: { 'x-sendit-signature': signature },
    });

    const response = await harness.run();

    expect(harness.returnJsonArray).toHaveBeenCalledWith(body);
    expect(response).toEqual({ workflowData: [[{ json: body }]] });
  });

  it('rejects missing signature header', async () => {
    const harness = createWebhookHarness({
      secret: 'whsec_test_secret',
      body: { event: 'post.failed' },
      headers: {},
    });

    await expect(harness.run()).rejects.toThrow(NodeOperationError);
    await expect(harness.run()).rejects.toThrow(
      'Missing X-SendIt-Signature header. Webhook request rejected.',
    );
  });

  it('rejects invalid signature', async () => {
    const secret = 'whsec_test_secret';
    const body = { event: 'post.scheduled', postId: 'post_1' };
    const timestamp = Math.floor(Date.now() / 1000);
    const validSignature = createSignature(secret, body, timestamp);
    const tamperedSignature = `${validSignature.slice(0, -1)}0`;

    const harness = createWebhookHarness({
      secret,
      body,
      headers: { 'x-sendit-signature': tamperedSignature },
    });

    await expect(harness.run()).rejects.toThrow(NodeOperationError);
    await expect(harness.run()).rejects.toThrow(
      'Invalid webhook signature. Request may be tampered with or expired.',
    );
  });

  it('rejects expired timestamp signatures', async () => {
    const secret = 'whsec_test_secret';
    const body = { event: 'post.deleted', postId: 'post_42' };
    const expiredTimestamp = Math.floor(Date.now() / 1000) - 301;
    const signature = createSignature(secret, body, expiredTimestamp);

    const harness = createWebhookHarness({
      secret,
      body,
      headers: { 'x-sendit-signature': signature },
    });

    await expect(harness.run()).rejects.toThrow(NodeOperationError);
    await expect(harness.run()).rejects.toThrow(
      'Invalid webhook signature. Request may be tampered with or expired.',
    );
  });
});
