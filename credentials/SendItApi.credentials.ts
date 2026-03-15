import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SendItApi implements ICredentialType {
  name = 'sendItApi';
  displayName = 'SendIt API';
  documentationUrl = 'https://sendit.infiniteappsai.com/documentation.html';
  properties: INodeProperties[] = [
    {
      displayName: 'API Key',
      name: 'apiKey',
      type: 'string',
      typeOptions: {
        password: true,
      },
      default: '',
      required: true,
      placeholder: 'sk_live_your_api_key_here',
      description: 'Your SendIt API key. Get it from Dashboard → API Keys → Create New Key. Format: sk_live_... Restricted-scope keys are supported; operations requiring unavailable scopes will return API errors when executed.',
    },
  ];

  authenticate: IAuthenticateGeneric = {
    type: 'generic',
    properties: {
      headers: {
        Authorization: '={{"Bearer " + $credentials.apiKey}}',
      },
    },
  };

  test: ICredentialTestRequest = {
    request: {
      baseURL: 'https://sendit.infiniteappsai.com/api/v1',
      url: '/capabilities',
    },
  };
}
