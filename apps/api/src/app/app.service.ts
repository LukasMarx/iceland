import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@islandhub/domain';
import { ApiDemoStateRepository } from './api-demo-state.repository';

@Injectable()
export class AppService {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly stateRepository: ApiDemoStateRepository) {}

  getData(): HealthResponse {
    return this.getHealth();
  }

  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'islandhub-api',
      mode: 'seed',
      version: '0.2.0',
      checkedAt: new Date().toISOString(),
    };
  }
}
