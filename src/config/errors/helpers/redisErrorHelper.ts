import { TRedisCommands, TRedisOptions } from '../../interfaces/IRedis';
import { UnknownError } from '../classes/SystemErrors';

async function retryOperation(fn: () => any, options: TRedisOptions | undefined, operation: TRedisCommands) {
  const data = await fn();
  if (operation === 'get') {
    if (data && options?.isJSON) {
      throw new Error(`proposital json`);
      /*       return JSON.parse(data); */
    }
    if (1 === 1) throw new Error(`proposital`);
    return data;
  }
  /*   if (operation === 'del') {
    return await RedisInstance.del(key);
  } */
}

export default async function redisErrorHelper<T>(
  fn: () => Promise<T>,
  options: TRedisOptions | undefined,
  operation: TRedisCommands,
) {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const data: T = await retryOperation(fn, options, operation).catch((error) => {
      if (data) return data;
      retries++;
      if (retries === maxRetries) throw new UnknownError(error);
    });
    return data;
  }
}
