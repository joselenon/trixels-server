export default interface ITransaction {
  createdAt: string;
  method: 'berry';
  type: 'deposit' | 'withdraw';
  userRef: any;
  value: number;
}
