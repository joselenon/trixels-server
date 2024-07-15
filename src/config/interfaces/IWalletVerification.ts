export interface IWalletVerificationInRedis {
  createdAt: number;
  userId: string;
  roninWallet: string;
  randomValue: number;
  request: string;
}
