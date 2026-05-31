import { Injectable, NestMiddleware } from '@nestjs/common';
import { RequestContextService } from './request-context.service';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  constructor(private readonly requestContext: RequestContextService) {}

  use(_request: unknown, _response: unknown, next: () => void) {
    this.requestContext.run(next);
  }
}