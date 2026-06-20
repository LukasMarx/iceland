import type { HealthResponse } from './types';

describe('domain — api contracts', () => {
  it('models a seed health response', () => {
    const response: HealthResponse = {
      status: 'ok',
      service: 'islandhub-api',
      mode: 'seed',
      version: 'test',
      checkedAt: '2026-05-25T07:42:00.000Z',
    };

    expect(response.status).toEqual('ok');
  });
});
