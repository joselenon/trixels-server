import { SystemError } from './SystemErrors';

export abstract class RedisError extends SystemError {
  constructor(message: string | undefined = undefined, type: string) {
    super(message, type);
    this.name = `Redis Error - ${type}`;
  }
}
