import { Injectable } from '@nestjs/common';
import type { HealthResponse } from '@islandhub/domain';

@Injectable()
export class AppService {
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
