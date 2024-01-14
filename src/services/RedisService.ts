/* eslint-disable no-constant-condition */
import Redis from 'ioredis';
import { promisify } from 'util';

import { TRedisCommands, TRedisKeys, TRedisOptions } from '../config/interfaces/IRedis';
import { RedisError } from '../config/errors/classes/SystemErrors';

export default class RedisService {
  private client: Redis;

  constructor(host: string, port: number, password: string = '') {
    this.client = new Redis({
      host,
      port,
      password,

      // Will run every connection fail
      retryStrategy: (times) => {
        const delay = Math.min(times * 100, 2000);
        return delay;
      },
    });
  }

  private promisifyCommand(command: TRedisCommands) {
    return promisify(this.client[command]).bind(this.client);
  }

  async isRedisClientOn() {
    try {
      await this.client.ping();
      return true;
    } catch (err) {
      return false;
    }
  }

  // Function responsible for "retry catches"
  async retryWithBackoff<T>(
    func: () => Promise<T>,
    maxTries: number = 5,
    delayMs: number = 2000,
  ): Promise<T> {
    let retryCount = 0;

    while (true) {
      try {
        const result = await func();
        return result;
      } catch (err: any) {
        retryCount++;
        if (retryCount >= maxTries) {
          throw new RedisError(err); // Se atingir o máximo de tentativas, lança o erro
        }
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  async del(key: TRedisKeys) {
    const syncDel = this.promisifyCommand('del');
    const fn = async () => syncDel(key);
    const data = await this.retryWithBackoff(fn);
    return data;
  }

  async set(
    key: TRedisKeys,
    value: any,
    options?: TRedisOptions,
    expirationInSeconds: number | null = null,
  ) {
    const syncSet = this.promisifyCommand('set');

    // args: key, value, EX (optional), expirationMs(optional)
    const args = [key, options?.isJSON ? JSON.stringify(value) : value];
    if (expirationInSeconds) {
      args.push('EX', expirationInSeconds);
    }

    const fn = async () => await syncSet(...args);
    const data = await this.retryWithBackoff(fn);

    return data;
  }

  async get<T>(key: TRedisKeys, options?: TRedisOptions): Promise<T | null | undefined> {
    const syncGet = this.promisifyCommand('get');
    const fn = async () => await syncGet(key);
    const data = await this.retryWithBackoff(fn);

    if (data && options?.isJSON) {
      return JSON.parse(data);
    }
    return data as T | null;
  }

  // Add element to the left of a list
  async lPush(key: TRedisKeys, value: any, options?: TRedisOptions) {
    const syncLPush = this.promisifyCommand('lpush');

    const args = [key, options?.isJSON ? JSON.stringify(value) : value];
    const fn = async () => await syncLPush(...args);
    const data = await this.retryWithBackoff(fn);

    return data;
  }

  // Add element to the right of a list
  async rPush(key: TRedisKeys, value: any, options?: TRedisOptions) {
    const syncRPush = this.promisifyCommand('rpush');

    const args = [key, options?.isJSON ? JSON.stringify(value) : value];
    const fn = async () => await syncRPush(...args);
    const data = await this.retryWithBackoff(fn);

    return data;
  }

  // Returns list of elements
  async lRange<T>(key: TRedisKeys, options?: TRedisOptions): Promise<T[] | null> {
    const syncLRange = this.promisifyCommand('lrange');

    const fn = async () => await syncLRange(key, 0, -1);
    const data = await this.retryWithBackoff(fn);

    if (data && options?.isJSON) {
      return data.map((item: any) => JSON.parse(item));
    } else {
      return data;
    }
  }

  // Removes and returns first element of the list
  async lPop<T>(
    key: TRedisKeys,
    count: number,
    options?: TRedisOptions,
  ): Promise<T | null> {
    const syncLPop = this.promisifyCommand('lpop');

    const fn = async () => await syncLPop(key, count);
    const data = await this.retryWithBackoff(fn);

    if (data && options?.isJSON) {
      return JSON.parse(data);
    } else {
      return data;
    }
  }

  // Removes and returns last element of the list
  async rPop<T>(
    key: TRedisKeys,
    count: number,
    options?: TRedisOptions,
  ): Promise<T | null> {
    const syncRPop = this.promisifyCommand('rpop');

    const fn = async () => await syncRPop(key, count);
    const data = await this.retryWithBackoff(fn);

    if (data && options?.isJSON) {
      return JSON.parse(data);
    } else {
      return data;
    }
  }
}
