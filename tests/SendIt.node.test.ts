import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SendIt } from '../nodes/SendIt/SendIt.node';

type NodeParameters = Record<string, unknown>;

interface ExecuteContextOverrides {
  continueOnFail?: boolean;
  response?: unknown;
  assertBinaryDataResult?: { fileName?: string };
  binaryBuffer?: Buffer;
}

interface ExecuteTestHarness {
  httpRequestWithAuthentication: ReturnType<typeof vi.fn>;
  assertBinaryData: ReturnType<typeof vi.fn>;
  getBinaryDataBuffer: ReturnType<typeof vi.fn>;
  run: () => Promise<unknown>;
}

function createHarness(
  parameters: NodeParameters,
  overrides: ExecuteContextOverrides = {},
): ExecuteTestHarness {
  const response = overrides.response ?? { ok: true };
  const httpRequestWithAuthentication = vi.fn(async () => response);
  const assertBinaryData = vi.fn(() => overrides.assertBinaryDataResult ?? { fileName: 'upload.bin' });
  const getBinaryDataBuffer = vi.fn(async () => overrides.binaryBuffer ?? Buffer.from('buffer'));

  const context = {
    getInputData: () => [{ json: {} }],
    getNodeParameter: (name: string) => parameters[name],
    continueOnFail: () => overrides.continueOnFail ?? false,
    getNode: () => ({ name: 'SendIt', type: 'sendIt' }),
    helpers: {
      httpRequestWithAuthentication,
      assertBinaryData,
      getBinaryDataBuffer,
    },
  };

  return {
    httpRequestWithAuthentication,
    assertBinaryData,
    getBinaryDataBuffer,
    run: async () => {
      const node = new SendIt();
      return node.execute.call(context as never);
    },
  };
}

function getRequestCall(mockFn: ReturnType<typeof vi.fn>): {
  credentialName: string;
  request: Record<string, unknown>;
} {
  const call = mockFn.mock.calls[0];
  return {
    credentialName: call[0] as string,
    request: call[1] as Record<string, unknown>,
  };
}

describe('SendIt node regression mapping', () => {
  const legacyCases: Array<{
    name: string;
    params: NodeParameters;
    expected: Partial<Record<string, unknown>>;
  }> = [
    {
      name: 'post.publish',
      params: {
        resource: 'post',
        operation: 'publish',
        platforms: ['linkedin', 'x'],
        text: 'Launch update',
        mediaUrl: 'https://cdn.example.com/photo.jpg',
        additionalOptions: {
          mediaUrls: 'https://a.jpg, https://b.jpg',
          mediaType: 'image',
          facebookMode: 'reel',
          youtubeMode: 'short',
          pinterestBoardId: 'board_123',
        },
      },
      expected: { method: 'POST', url: '/publish', json: true },
    },
    {
      name: 'post.publishAi',
      params: {
        resource: 'post',
        operation: 'publishAi',
        platforms: ['linkedin'],
        mediaUrl: '',
        aiPrompt: 'Make this concise',
        aiOptions: { hashtags: 'on', strictAi: true },
      },
      expected: { method: 'POST', url: '/publish-ai', json: true },
    },
    {
      name: 'ai.generate',
      params: {
        resource: 'ai',
        operation: 'generate',
        platforms: ['threads'],
        mediaUrl: 'https://cdn.example.com/image.png',
        aiPrompt: 'Write short copy',
        aiOptions: {},
      },
      expected: { method: 'POST', url: '/ai/generate-content', json: true },
    },
    {
      name: 'scheduledPost.create',
      params: {
        resource: 'scheduledPost',
        operation: 'create',
        platforms: ['linkedin'],
        text: 'Scheduled',
        mediaUrl: '',
        scheduledTime: '2026-01-15T12:00:00.000Z',
      },
      expected: { method: 'POST', url: '/schedule', json: true },
    },
    {
      name: 'scheduledPost.getAll',
      params: {
        resource: 'scheduledPost',
        operation: 'getAll',
        platformFilter: 'linkedin',
      },
      expected: { method: 'GET', url: '/scheduled' },
    },
    {
      name: 'scheduledPost.delete',
      params: {
        resource: 'scheduledPost',
        operation: 'delete',
        scheduleId: 'sched_123',
      },
      expected: { method: 'DELETE', url: '/scheduled/sched_123' },
    },
    {
      name: 'scheduledPost.trigger',
      params: {
        resource: 'scheduledPost',
        operation: 'trigger',
        scheduleId: 'sched_777',
      },
      expected: { method: 'POST', url: '/scheduled/sched_777/trigger' },
    },
    {
      name: 'account.getAll',
      params: { resource: 'account', operation: 'getAll' },
      expected: { method: 'GET', url: '/accounts' },
    },
    {
      name: 'validation.validate',
      params: {
        resource: 'validation',
        operation: 'validate',
        platforms: ['instagram'],
        text: 'Validate me',
        mediaUrl: '',
        additionalOptions: { mediaUrls: 'https://1.jpg,https://2.jpg', mediaType: 'video' },
      },
      expected: { method: 'POST', url: '/validate', json: true },
    },
    {
      name: 'analytics.getAnalytics',
      params: { resource: 'analytics', operation: 'getAnalytics', analyticsPlatform: 'linkedin' },
      expected: { method: 'GET', url: '/analytics' },
    },
    {
      name: 'brandVoice.create',
      params: {
        resource: 'brandVoice',
        operation: 'create',
        brandVoiceName: 'Core Voice',
        brandVoiceDescription: 'Audience-first',
        brandVoiceTone: 'professional',
        brandVoiceVocabulary: 'scale,growth',
        brandVoiceBannedWords: 'cheap,spammy',
        brandVoiceIsDefault: true,
      },
      expected: { method: 'POST', url: '/brand-voice', json: true },
    },
    {
      name: 'campaign.schedule',
      params: { resource: 'campaign', operation: 'schedule', campaignId: 'camp_123' },
      expected: { method: 'POST', url: '/campaigns/camp_123/schedule', json: true },
    },
    {
      name: 'inbox.list',
      params: {
        resource: 'inbox',
        operation: 'list',
        inboxPlatformFilter: 'linkedin',
        inboxStatusFilter: 'open',
        inboxLimit: 12,
      },
      expected: { method: 'GET', url: '/inbox' },
    },
    {
      name: 'inbox.reply',
      params: {
        resource: 'inbox',
        operation: 'reply',
        inboxThreadId: 'thread_77',
        inboxMessage: 'Thanks for reaching out!',
      },
      expected: { method: 'POST', url: '/inbox/thread_77/reply', json: true },
    },
    {
      name: 'listening.refresh',
      params: {
        resource: 'listening',
        operation: 'refresh',
        listeningPlatforms: ['x', 'threads'],
        listeningKeywordIds: 'key_1,key_2',
      },
      expected: { method: 'POST', url: '/listening/refresh', json: true },
    },
    {
      name: 'aiMedia.getStatus',
      params: { resource: 'aiMedia', operation: 'getStatus', aiMediaJobId: 'job_abc' },
      expected: { method: 'GET', url: '/ai-media/job_abc' },
    },
  ];

  legacyCases.forEach((testCase) => {
    it(`maps ${testCase.name}`, async () => {
      const harness = createHarness(testCase.params);
      const output = await harness.run();

      const { credentialName, request } = getRequestCall(harness.httpRequestWithAuthentication);
      expect(credentialName).toBe('sendItApi');
      expect(request).toMatchObject(testCase.expected);
      expect(output).toEqual([[{ json: { ok: true } }]]);
    });
  });

  it('uploads media from binary input mode', async () => {
    const harness = createHarness(
      {
        resource: 'media',
        operation: 'upload',
        mediaInputMode: 'binary',
        binaryPropertyName: 'attachment',
      },
      {
        assertBinaryDataResult: { fileName: 'photo.png' },
        binaryBuffer: Buffer.from('img-bytes'),
      },
    );

    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);

    expect(harness.assertBinaryData).toHaveBeenCalledWith(0, 'attachment');
    expect(harness.getBinaryDataBuffer).toHaveBeenCalledWith(0, 'attachment');
    expect(request).toMatchObject({ method: 'POST', url: '/media/upload' });
    expect(request.body).toBeInstanceOf(FormData);
    const file = (request.body as FormData).get('file') as File;
    expect(file.name).toBe('photo.png');
  });

  it('uploads media from file path mode', async () => {
    const tempDir = await mkdtemp(path.join(tmpdir(), 'sendit-test-'));
    const filePath = path.join(tempDir, 'upload.txt');
    await writeFile(filePath, 'hello from test', 'utf8');

    try {
      const harness = createHarness({
        resource: 'media',
        operation: 'upload',
        mediaInputMode: 'filePath',
        filePath,
      });

      await harness.run();
      const { request } = getRequestCall(harness.httpRequestWithAuthentication);

      expect(request).toMatchObject({ method: 'POST', url: '/media/upload' });
      expect(request.body).toBeInstanceOf(FormData);
      const file = (request.body as FormData).get('file') as File;
      expect(file.name).toBe('upload.txt');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('SendIt node parity additions', () => {
  const newCases: Array<{
    name: string;
    params: NodeParameters;
    expected: Partial<Record<string, unknown>>;
  }> = [
    {
      name: 'meta.getCapabilities',
      params: { resource: 'meta', operation: 'getCapabilities' },
      expected: { method: 'GET', url: '/capabilities' },
    },
    {
      name: 'meta.getRequirements',
      params: { resource: 'meta', operation: 'getRequirements', metaPlatform: 'linkedin' },
      expected: { method: 'GET', url: '/requirements', qs: { platform: 'linkedin' } },
    },
    {
      name: 'meta.getPlatformSettingsSchema',
      params: {
        resource: 'meta',
        operation: 'getPlatformSettingsSchema',
        metaPlatform: 'x',
      },
      expected: { method: 'GET', url: '/platforms/schema', qs: { platform: 'x' } },
    },
    {
      name: 'meta.getBestTimes',
      params: {
        resource: 'meta',
        operation: 'getBestTimes',
        metaPlatform: 'threads',
        metaBestTimesLimit: 7,
      },
      expected: { method: 'GET', url: '/best-times', qs: { platform: 'threads', limit: 7 } },
    },
    {
      name: 'meta.getWebhookEventsCatalog',
      params: { resource: 'meta', operation: 'getWebhookEventsCatalog' },
      expected: { method: 'GET', url: '/webhooks/events-catalog' },
    },
    {
      name: 'meta.getWebhookTriggers',
      params: { resource: 'meta', operation: 'getWebhookTriggers' },
      expected: { method: 'GET', url: '/webhooks/triggers' },
    },
    {
      name: 'contentScore.score',
      params: {
        resource: 'contentScore',
        operation: 'score',
        platforms: ['linkedin', 'x'],
        text: 'Score this post',
        mediaUrl: '',
        scoreMediaUrls: 'https://a.jpg,https://b.jpg',
      },
      expected: { method: 'POST', url: '/content-score', json: true },
    },
    {
      name: 'library.list',
      params: {
        resource: 'library',
        operation: 'list',
        libraryType: 'template',
        libraryCategory: 'launch',
        libraryTags: 'ai,marketing',
        libraryTargetPlatforms: ['linkedin'],
        librarySearch: 'product',
        libraryLimit: 20,
        libraryOffset: 5,
      },
      expected: { method: 'GET', url: '/library' },
    },
    {
      name: 'library.create',
      params: {
        resource: 'library',
        operation: 'create',
        libraryTitle: 'Template 1',
        libraryText: 'Body',
        libraryType: 'template',
        libraryCategory: 'launch',
        libraryTags: 'a,b',
        libraryTargetPlatforms: ['linkedin', 'x'],
        libraryEvergreenEnabled: true,
        libraryEvergreenIntervalDays: 7,
        libraryEvergreenMaxPublishes: 3,
      },
      expected: { method: 'POST', url: '/library', json: true },
    },
    {
      name: 'library.get',
      params: { resource: 'library', operation: 'get', libraryItemId: 'lib_1' },
      expected: { method: 'GET', url: '/library/lib_1' },
    },
    {
      name: 'library.update',
      params: {
        resource: 'library',
        operation: 'update',
        libraryItemId: 'lib_2',
        libraryTitle: 'Template 2',
        libraryText: 'Updated',
        libraryType: 'draft',
        libraryCategory: 'news',
        libraryTags: 'x,y',
        libraryTargetPlatforms: ['threads'],
        libraryEvergreenEnabled: false,
        libraryEvergreenIntervalDays: 0,
        libraryEvergreenMaxPublishes: 0,
      },
      expected: { method: 'PATCH', url: '/library/lib_2', json: true },
    },
    {
      name: 'library.delete',
      params: { resource: 'library', operation: 'delete', libraryItemId: 'lib_3' },
      expected: { method: 'DELETE', url: '/library/lib_3' },
    },
    {
      name: 'library.listCategories',
      params: { resource: 'library', operation: 'listCategories' },
      expected: { method: 'GET', url: '/library/categories' },
    },
    {
      name: 'library.listTags',
      params: { resource: 'library', operation: 'listTags' },
      expected: { method: 'GET', url: '/library/tags' },
    },
    {
      name: 'approvals.list',
      params: { resource: 'approvals', operation: 'list' },
      expected: { method: 'GET', url: '/approvals' },
    },
    {
      name: 'approvals.approve',
      params: {
        resource: 'approvals',
        operation: 'approve',
        approvalPostId: 'sched_1',
        approvalComment: 'Looks good',
      },
      expected: { method: 'POST', url: '/approvals/sched_1/approve', json: true },
    },
    {
      name: 'approvals.reject',
      params: {
        resource: 'approvals',
        operation: 'reject',
        approvalPostId: 'sched_2',
        approvalReason: 'Needs edits',
      },
      expected: { method: 'POST', url: '/approvals/sched_2/reject', json: true },
    },
    {
      name: 'bulkSchedule.listImports',
      params: { resource: 'bulkSchedule', operation: 'listImports' },
      expected: { method: 'GET', url: '/bulk-schedule' },
    },
    {
      name: 'bulkSchedule.getImport',
      params: { resource: 'bulkSchedule', operation: 'getImport', bulkImportId: 'imp_1' },
      expected: { method: 'GET', url: '/bulk-schedule/imp_1' },
    },
    {
      name: 'bulkSchedule.validateCsv',
      params: {
        resource: 'bulkSchedule',
        operation: 'validateCsv',
        bulkCsvContent: 'platforms,text\nlinkedin,hello',
        bulkFilename: 'upload.csv',
      },
      expected: { method: 'POST', url: '/bulk-schedule/validate', json: true },
    },
    {
      name: 'bulkSchedule.importCsv',
      params: {
        resource: 'bulkSchedule',
        operation: 'importCsv',
        bulkCsvContent: 'platforms,text\nlinkedin,hello',
        bulkFilename: 'upload.csv',
        bulkSkipErrors: true,
      },
      expected: { method: 'POST', url: '/bulk-schedule/import', json: true },
    },
    {
      name: 'bulkSchedule.downloadTemplate',
      params: { resource: 'bulkSchedule', operation: 'downloadTemplate' },
      expected: { method: 'GET', url: '/bulk-schedule/template', json: false },
    },
    {
      name: 'connect.getConnectAction',
      params: { resource: 'connect', operation: 'getConnectAction', connectPlatform: 'linkedin' },
      expected: { method: 'GET', url: '/connect/linkedin' },
    },
    {
      name: 'connect.connectToken',
      params: {
        resource: 'connect',
        operation: 'connectToken',
        connectPlatform: 'slack',
        connectCredentialsJson: '{"token":"abc123"}',
      },
      expected: { method: 'POST', url: '/connect/token', json: true },
    },
    {
      name: 'connect.connectWebhook',
      params: {
        resource: 'connect',
        operation: 'connectWebhook',
        connectPlatform: 'discord',
        connectWebhookUrl: 'https://hooks.example.com/a',
        connectMetadataJson: '{"channel":"ops"}',
      },
      expected: { method: 'POST', url: '/connect/webhook', json: true },
    },
    {
      name: 'inbox.getThread',
      params: { resource: 'inbox', operation: 'getThread', inboxThreadId: 'th_1' },
      expected: { method: 'GET', url: '/inbox/th_1' },
    },
    {
      name: 'inbox.updateStatus',
      params: {
        resource: 'inbox',
        operation: 'updateStatus',
        inboxThreadId: 'th_2',
        inboxThreadStatus: 'closed',
      },
      expected: { method: 'POST', url: '/inbox/th_2/status', json: true },
    },
    {
      name: 'listening.listKeywords',
      params: {
        resource: 'listening',
        operation: 'listKeywords',
        listeningActiveOnly: true,
        listeningKeywordType: 'brand',
      },
      expected: { method: 'GET', url: '/listening/keywords' },
    },
    {
      name: 'listening.createKeyword',
      params: {
        resource: 'listening',
        operation: 'createKeyword',
        listeningKeyword: 'sendit',
        listeningKeywordType: 'brand',
        listeningPlatforms: ['x'],
        listeningNotifyEmail: true,
        listeningNotifyWebhook: false,
        listeningWebhookUrl: '',
        listeningSentimentFilter: 'negative',
      },
      expected: { method: 'POST', url: '/listening/keywords', json: true },
    },
    {
      name: 'listening.getKeyword',
      params: { resource: 'listening', operation: 'getKeyword', listeningKeywordId: 'kw_1' },
      expected: { method: 'GET', url: '/listening/keywords/kw_1' },
    },
    {
      name: 'listening.updateKeyword',
      params: {
        resource: 'listening',
        operation: 'updateKeyword',
        listeningKeywordId: 'kw_2',
        listeningKeywordType: 'product',
        listeningPlatforms: ['linkedin'],
        listeningNotifyEmail: false,
        listeningNotifyWebhook: true,
        listeningWebhookUrl: 'https://hooks.example.com/listening',
        listeningSentimentFilter: 'positive',
      },
      expected: { method: 'PATCH', url: '/listening/keywords/kw_2', json: true },
    },
    {
      name: 'listening.deleteKeyword',
      params: { resource: 'listening', operation: 'deleteKeyword', listeningKeywordId: 'kw_3' },
      expected: { method: 'DELETE', url: '/listening/keywords/kw_3' },
    },
    {
      name: 'listening.listMentions',
      params: {
        resource: 'listening',
        operation: 'listMentions',
        listeningMentionKeywordId: 'kw_1',
        listeningMentionPlatform: 'x',
        listeningSentimentFilter: 'negative',
        listeningIsRead: 'false',
        listeningIsArchived: 'false',
        listeningSince: '2026-02-19T00:00:00.000Z',
        listeningLimit: 25,
        listeningOffset: 10,
      },
      expected: { method: 'GET', url: '/listening/mentions' },
    },
    {
      name: 'listening.getMention',
      params: { resource: 'listening', operation: 'getMention', listeningMentionId: 'm_1' },
      expected: { method: 'GET', url: '/listening/mentions/m_1' },
    },
    {
      name: 'listening.markMentionsRead',
      params: {
        resource: 'listening',
        operation: 'markMentionsRead',
        listeningMentionIds: 'm_1,m_2',
      },
      expected: { method: 'POST', url: '/listening/mentions/mark-read', json: true },
    },
    {
      name: 'listening.archiveMentions',
      params: {
        resource: 'listening',
        operation: 'archiveMentions',
        listeningMentionIds: 'm_3,m_4',
      },
      expected: { method: 'POST', url: '/listening/mentions/archive', json: true },
    },
    {
      name: 'listening.listAlerts',
      params: {
        resource: 'listening',
        operation: 'listAlerts',
        listeningAlertsUnreadOnly: true,
        listeningAlertPriority: 'high',
        listeningLimit: 12,
      },
      expected: { method: 'GET', url: '/listening/alerts' },
    },
    {
      name: 'listening.markAlertsRead',
      params: {
        resource: 'listening',
        operation: 'markAlertsRead',
        listeningAlertIds: 'a_1,a_2',
      },
      expected: { method: 'POST', url: '/listening/alerts/mark-read', json: true },
    },
    {
      name: 'listening.dismissAlerts',
      params: {
        resource: 'listening',
        operation: 'dismissAlerts',
        listeningAlertIds: 'a_3,a_4',
      },
      expected: { method: 'POST', url: '/listening/alerts/dismiss', json: true },
    },
    {
      name: 'listening.getSummary',
      params: { resource: 'listening', operation: 'getSummary' },
      expected: { method: 'GET', url: '/listening/summary' },
    },
    {
      name: 'webhooks.testWebhook',
      params: { resource: 'webhooks', operation: 'testWebhook', webhookId: 'wh_1' },
      expected: { method: 'POST', url: '/webhooks/wh_1/test', json: true },
    },
  ];

  newCases.forEach((testCase) => {
    it(`maps ${testCase.name}`, async () => {
      const harness = createHarness(testCase.params);
      await harness.run();
      const { request } = getRequestCall(harness.httpRequestWithAuthentication);
      expect(request).toMatchObject(testCase.expected);
    });
  });

  it('adds optional team and idempotency headers', async () => {
    const harness = createHarness({
      resource: 'meta',
      operation: 'getCapabilities',
      teamId: 'team_123',
      idempotencyKey: 'idem_456',
    });

    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);

    expect(request.headers).toMatchObject({
      'X-Team-ID': 'team_123',
      'Idempotency-Key': 'idem_456',
    });
  });
});

describe('SendIt node advanced apiRequest', () => {
  it('maps valid v1 advanced request', async () => {
    const harness = createHarness({
      resource: 'advanced',
      operation: 'apiRequest',
      advancedMethod: 'GET',
      advancedPath: '/api/v1/capabilities',
      advancedQueryJson: '{"include_beta":"1"}',
      advancedBodyJson: '',
      advancedResponseMode: 'json',
      requestTimeoutMs: 8000,
      teamId: 'team_abc',
      idempotencyKey: 'idem_abc',
    });

    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);

    expect(request).toMatchObject({
      method: 'GET',
      url: '/api/v1/capabilities',
      json: true,
      timeout: 8000,
      qs: { include_beta: '1' },
      headers: {
        'X-Team-ID': 'team_abc',
        'Idempotency-Key': 'idem_abc',
      },
    });
  });

  it('maps valid v2 advanced request', async () => {
    const harness = createHarness({
      resource: 'advanced',
      operation: 'apiRequest',
      advancedMethod: 'POST',
      advancedPath: '/api/v2/approvals/action?team_id=team_1',
      advancedQueryJson: '{"team_id":"team_1"}',
      advancedBodyJson: '{"action":"approve","postId":"sched_1"}',
      advancedResponseMode: 'json',
      requestTimeoutMs: 12000,
    });

    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);

    expect(request).toMatchObject({
      method: 'POST',
      url: '/api/v2/approvals/action?team_id=team_1',
      json: true,
      timeout: 12000,
      qs: { team_id: 'team_1' },
      body: { action: 'approve', postId: 'sched_1' },
    });
  });

  it('rejects invalid path prefix', async () => {
    const harness = createHarness({
      resource: 'advanced',
      operation: 'apiRequest',
      advancedMethod: 'GET',
      advancedPath: '/health',
      advancedQueryJson: '',
      advancedBodyJson: '',
      advancedResponseMode: 'json',
      requestTimeoutMs: 5000,
    });

    await expect(harness.run()).rejects.toThrow('Advanced path must start with /api/v1/ or /api/v2/');
  });

  it('rejects invalid query json', async () => {
    const harness = createHarness({
      resource: 'advanced',
      operation: 'apiRequest',
      advancedMethod: 'GET',
      advancedPath: '/api/v1/capabilities',
      advancedQueryJson: '{bad json}',
      advancedBodyJson: '',
      advancedResponseMode: 'json',
      requestTimeoutMs: 5000,
    });

    await expect(harness.run()).rejects.toThrow('Query JSON must be valid JSON');
  });

  it('rejects invalid body json', async () => {
    const harness = createHarness({
      resource: 'advanced',
      operation: 'apiRequest',
      advancedMethod: 'POST',
      advancedPath: '/api/v1/publish',
      advancedQueryJson: '',
      advancedBodyJson: '{bad json}',
      advancedResponseMode: 'json',
      requestTimeoutMs: 5000,
    });

    await expect(harness.run()).rejects.toThrow('Body JSON must be valid JSON');
  });
});

describe('SendIt node Phase 2 new resources', () => {
  const phase2Cases: Array<{
    name: string;
    params: NodeParameters;
    expected: Partial<Record<string, unknown>>;
  }> = [
    // Dead Letter
    {
      name: 'deadLetter.list',
      params: { resource: 'deadLetter', operation: 'list', deadLetterStatus: 'dead', deadLetterLimit: 50 },
      expected: { method: 'GET', url: '/dead-letter' },
    },
    {
      name: 'deadLetter.requeue',
      params: { resource: 'deadLetter', operation: 'requeue', deadLetterId: 'dl_1' },
      expected: { method: 'POST', url: '/dead-letter/dl_1/requeue', json: true },
    },
    {
      name: 'deadLetter.discard',
      params: { resource: 'deadLetter', operation: 'discard', deadLetterId: 'dl_2' },
      expected: { method: 'POST', url: '/dead-letter/dl_2/discard', json: true },
    },
    // Audit Log
    {
      name: 'auditLog.list',
      params: {
        resource: 'auditLog',
        operation: 'list',
        auditAction: 'create',
        auditResourceType: 'post',
        auditStartDate: '2026-01-01T00:00:00Z',
        auditEndDate: '2026-02-01T00:00:00Z',
        auditLimit: 25,
        auditOffset: 0,
      },
      expected: { method: 'GET', url: '/audit-log' },
    },
    // Brand Voice CRUD completion
    {
      name: 'brandVoice.get',
      params: { resource: 'brandVoice', operation: 'get', brandVoiceId: 'bv_1' },
      expected: { method: 'GET', url: '/brand-voice/bv_1' },
    },
    {
      name: 'brandVoice.update',
      params: {
        resource: 'brandVoice',
        operation: 'update',
        brandVoiceId: 'bv_2',
        brandVoiceName: 'Updated Voice',
        brandVoiceDescription: 'New desc',
        brandVoiceTone: 'casual',
        brandVoiceVocabulary: 'fresh,bold',
        brandVoiceBannedWords: 'boring',
        brandVoiceIsDefault: false,
      },
      expected: { method: 'PATCH', url: '/brand-voice/bv_2', json: true },
    },
    {
      name: 'brandVoice.delete',
      params: { resource: 'brandVoice', operation: 'delete', brandVoiceId: 'bv_3' },
      expected: { method: 'DELETE', url: '/brand-voice/bv_3' },
    },
    // Webhooks CRUD completion
    {
      name: 'webhooks.list',
      params: { resource: 'webhooks', operation: 'list' },
      expected: { method: 'GET', url: '/webhooks' },
    },
    {
      name: 'webhooks.get',
      params: { resource: 'webhooks', operation: 'get', webhookId: 'wh_1' },
      expected: { method: 'GET', url: '/webhooks/wh_1' },
    },
    {
      name: 'webhooks.update',
      params: {
        resource: 'webhooks',
        operation: 'update',
        webhookId: 'wh_2',
        webhookUpdateUrl: 'https://example.com/hook',
        webhookUpdateEvents: 'post.published,post.failed',
        webhookUpdateActive: true,
      },
      expected: { method: 'PATCH', url: '/webhooks/wh_2', json: true },
    },
    // AI auxiliary
    {
      name: 'ai.replySuggestions',
      params: {
        resource: 'ai',
        operation: 'replySuggestions',
        aiMentionId: 'm_1',
        aiTone: 'professional',
        aiMaxLength: 280,
      },
      expected: { method: 'POST', url: '/ai/reply-suggestions', json: true },
    },
    {
      name: 'ai.mentionSummary',
      params: {
        resource: 'ai',
        operation: 'mentionSummary',
        aiSummarySince: '2026-02-01T00:00:00Z',
        aiSummaryPlatform: 'x',
        aiSummaryKeywordId: 'kw_1',
        aiSummaryLimit: 100,
      },
      expected: { method: 'POST', url: '/ai/mention-summary', json: true },
    },
    {
      name: 'ai.feedback',
      params: {
        resource: 'ai',
        operation: 'feedback',
        aiLogId: 'log_1',
        aiRating: 5,
        aiNotes: 'Great output',
      },
      expected: { method: 'POST', url: '/ai/feedback', json: true },
    },
    // Conversions
    {
      name: 'conversions.track',
      params: {
        resource: 'conversions',
        operation: 'track',
        conversionTrackedLinkId: 'tl_1',
        conversionShortCode: 'abc',
        conversionType: 'signup',
        conversionValue: 10,
        conversionMetadataJson: '{"source":"email"}',
      },
      expected: { method: 'POST', url: '/conversions', json: true },
    },
  ];

  phase2Cases.forEach((testCase) => {
    it(`maps ${testCase.name}`, async () => {
      const harness = createHarness(testCase.params);
      await harness.run();
      const { request } = getRequestCall(harness.httpRequestWithAuthentication);
      expect(request).toMatchObject(testCase.expected);
    });
  });
});

describe('SendIt node pagination and body verification', () => {
  it('account.getAll sends limit in qs', async () => {
    const harness = createHarness({
      resource: 'account',
      operation: 'getAll',
      accountLimit: 25,
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'GET', url: '/accounts' });
    expect(request.qs).toMatchObject({ limit: 25 });
  });

  it('campaign.list sends limit and offset in qs', async () => {
    const harness = createHarness({
      resource: 'campaign',
      operation: 'list',
      campaignLimit: 10,
      campaignOffset: 5,
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'GET', url: '/campaigns' });
    expect(request.qs).toMatchObject({ limit: 10, offset: 5 });
  });

  it('approvals.list sends limit and offset in qs', async () => {
    const harness = createHarness({
      resource: 'approvals',
      operation: 'list',
      approvalLimit: 30,
      approvalOffset: 10,
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'GET', url: '/approvals' });
    expect(request.qs).toMatchObject({ limit: 30, offset: 10 });
  });

  it('brandVoice.list sends limit in qs', async () => {
    const harness = createHarness({
      resource: 'brandVoice',
      operation: 'list',
      brandVoiceLimit: 15,
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'GET', url: '/brand-voice' });
    expect(request.qs).toMatchObject({ limit: 15 });
  });

  it('campaign.plan uses brief field with objective fallback', async () => {
    const harness = createHarness({
      resource: 'campaign',
      operation: 'plan',
      campaignObjective: 'Increase brand awareness',
      campaignPlatforms: ['linkedin', 'x'],
      campaignBrief: '',
      campaignPostCount: 3,
      campaignStartDate: '',
      campaignEndDate: '',
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'POST', url: '/campaigns', json: true });
    const body = request.body as Record<string, unknown>;
    expect(body.brief).toBe('Increase brand awareness');
    expect(body.platforms).toEqual(['linkedin', 'x']);
    expect(body.postCount).toBe(3);
  });

  it('aiMedia.create sends stylePreset in parameters when provided', async () => {
    const harness = createHarness({
      resource: 'aiMedia',
      operation: 'create',
      aiMediaProvider: 'runway',
      aiMediaPrompt: 'A sunset timelapse',
      aiMediaType: 'video',
      aiMediaStylePreset: 'cinematic',
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'POST', url: '/ai-media', json: true });
    const body = request.body as Record<string, unknown>;
    expect(body.provider).toBe('runway');
    expect(body.prompt).toBe('A sunset timelapse');
    expect(body.media_type).toBe('video');
    expect(body.parameters).toEqual({ stylePreset: 'cinematic' });
  });

  it('aiMedia.create sends empty parameters when no stylePreset', async () => {
    const harness = createHarness({
      resource: 'aiMedia',
      operation: 'create',
      aiMediaProvider: 'sora',
      aiMediaPrompt: 'A cat',
      aiMediaType: 'image',
      aiMediaStylePreset: '',
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    const body = request.body as Record<string, unknown>;
    expect(body.parameters).toEqual({});
  });

  it('deadLetter.list omits status when empty (all statuses)', async () => {
    const harness = createHarness({
      resource: 'deadLetter',
      operation: 'list',
      deadLetterStatus: '',
      deadLetterLimit: 50,
    });
    await harness.run();
    const { request } = getRequestCall(harness.httpRequestWithAuthentication);
    expect(request).toMatchObject({ method: 'GET', url: '/dead-letter' });
    expect(request.qs).toMatchObject({ limit: 50 });
    expect((request.qs as Record<string, unknown>).status).toBeUndefined();
  });

  it('throws on unknown operation', async () => {
    const harness = createHarness({
      resource: 'account',
      operation: 'nonexistent',
      accountLimit: 50,
    });
    await expect(harness.run()).rejects.toThrow('Unknown operation: nonexistent');
  });
});
