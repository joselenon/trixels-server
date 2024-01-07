export type TRedisCommands =
  | 'del'
  | 'get'
  | 'set'
  | 'lpush'
  | 'rpush'
  | 'lrange'
  | 'lpop'
  | 'rpop';

export type TRedisOptions = { inJSON: boolean };
