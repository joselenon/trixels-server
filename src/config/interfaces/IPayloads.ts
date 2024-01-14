export interface ICreateUserPayload {
  username: string;
  steamid?: string;
  avatar: string;
  balance: number;
  tradeLink?: string;
  email?: string;
}
