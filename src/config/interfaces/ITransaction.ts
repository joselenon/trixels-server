export default interface ITransaction {
  createdAt: string;
  method: 'code';
  type: 'deposit' | 'withdraw';
  userRef: any;
  value: number;
}
