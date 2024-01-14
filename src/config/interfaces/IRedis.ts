export type TRedisCommands =
  | 'del'
  | 'get'
  | 'set'
  | 'lpush'
  | 'rpush'
  | 'lrange'
  | 'lpop'
  | 'rpop';

export type TRedisOptions = { isJSON: boolean };

export type TRedisKeys = 'lastItemsUpdate' | 'allItemsListings' | string;

/*

Chaves únicas para cada usuário:
- resources:USERID

*/
