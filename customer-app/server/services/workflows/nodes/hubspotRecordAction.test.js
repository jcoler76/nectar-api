import * as executor from './hubspotRecordAction';

jest.mock('../../hubspot/HubSpotService', () => {
  return jest.fn().mockImplementation(() => ({
    createRecord: jest.fn().mockResolvedValue({ id: '1' }),
    updateRecord: jest.fn().mockResolvedValue({ id: '2' }),
    findRecord: jest.fn().mockResolvedValue({ id: '3' }),
    findOrCreate: jest.fn().mockResolvedValue({ action: 'created', record: { id: '4' } }),
    createOrUpdate: jest.fn().mockResolvedValue({ action: 'updated', record: { id: '5' } }),
    associate: jest.fn().mockResolvedValue({ ok: true }),
    addToList: jest.fn().mockResolvedValue({ ok: true }),
    createNote: jest.fn().mockResolvedValue({ id: 'note' }),
  }));
});

const baseConfig = {
  label: 'Test',
  connection: { accessToken: 't' },
  object: 'contact',
  dataMapping: { properties: { 'input.email': 'email' } },
};

const context = { input: { email: 'a@b.com' }, currentNodeId: 'n1' };

describe('hubspotRecordAction executor', () => {
  test('create operation', async () => {
    const res = await executor.execute({ ...baseConfig, operation: 'create' }, context);
    expect(res.status).toBe('success');
  });
  test('findOrCreate operation', async () => {
    const res = await executor.execute(
      { ...baseConfig, operation: 'findOrCreate', search: { property: 'email', value: 'a@b.com' } },
      context
    );
    expect(res.status).toBe('success');
  });
});
