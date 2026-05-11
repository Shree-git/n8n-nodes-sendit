/* eslint-disable @n8n/community-nodes/no-restricted-imports */
import { describe, expect, it } from 'vitest';
import { SendItApi } from '../credentials/SendItApi.credentials';

describe('SendItApi credentials', () => {
  it('uses Bearer authorization header format', () => {
    const credentials = new SendItApi();

    expect(credentials.authenticate).toEqual({
      type: 'generic',
      properties: {
        headers: {
          Authorization: '={{"Bearer " + $credentials.apiKey}}',
        },
      },
    });
  });

  it('defines a lightweight credential test request', () => {
    const credentials = new SendItApi();

    expect(credentials.test.request).toEqual({
      baseURL: 'https://sendit.infiniteappsai.com/api/v1',
      url: '/capabilities',
    });
  });
});
