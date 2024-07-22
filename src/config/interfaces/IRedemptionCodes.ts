export default interface IRedemptionCodesInDb {
  createdAt: number;
  createdBy: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>;
  codeValue: number;
  info: {
    claims: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData>[];
    numberOfUses: number;
    reward: number;
  };
  rules?: any;
}
