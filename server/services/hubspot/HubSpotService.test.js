import HubSpotService from './HubSpotService';

jest.mock('axios', () => {
  const post = jest.fn();
  const get = jest.fn();
  return {
    __esModule: true,
    default: { create: jest.fn(() => ({ post, get })) },
    create: jest.fn(() => ({ post, get })),
  };
});

describe('HubSpotService', () => {
  test('constructs with token and performs searchRecords', async () => {
    const axios = require('axios');
    const client = axios.create();
    client.post.mockResolvedValueOnce({ status: 200, data: { results: [{ id: '1' }] } });

    const svc = new HubSpotService({ accessToken: 't' });
    const data = await svc.searchRecords(
      'contact',
      [
        {
          filters: [{ propertyName: 'createdate', operator: 'GT', value: 0 }],
        },
      ],
      [{ propertyName: 'createdate', direction: 'DESCENDING' }],
      5,
      0,
      ['email']
    );
    expect(client.post).toHaveBeenCalledWith(
      '/crm/v3/objects/contact/search',
      expect.objectContaining({ limit: 5, filterGroups: expect.any(Array) }),
      expect.objectContaining({ validateStatus: expect.any(Function) })
    );
    expect(data.results[0].id).toBe('1');
  });
});
