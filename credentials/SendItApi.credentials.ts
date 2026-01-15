import {
  IAuthenticateGeneric,
  ICredentialTestRequest,
  ICredentialType,
  INodeProperties,
} from 'n8n-workflow';

export class SendItApi implements ICredentialType {
  name = 'sendItApi';
  displayName = 'SendIt API';
  documentationUrl = 'https://sendit.infiniteappsai.com/docs/api';
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
      description: 'Your SendIt API key (starts with sk_live_). Get it from your SendIt Dashboard.',
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
      url: '/accounts',
    },
  };
}
