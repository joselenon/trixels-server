import * as admin from 'firebase-admin';

export type TResourcesTypes =
  | 'CHICKEN'
  | 'SLUGGER'
  | 'MINE'
  | 'APIARY'
  | 'SPECIAL_MINE'
  | 'COOP';

export interface IResourceInfoCreationPayload {
  resourceType: TResourcesTypes;
  cooldown: number;
  landNumber: number;
  startTime: number;
  account: string;
}

export interface IUserResourceFirebase {
  resources: { resourceType: TResourcesTypes; landNumber: number; account: string }[];
  updatedAt: number;
  userRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;
}

export interface IUserResourceFrontEnd {
  resourceType: TResourcesTypes;
  landNumber: number;
  startTime?: number;
  account: string;
}

export interface IUsersResourcesRedis {
  [username: string]: IUserResourceFrontEnd[];
}

export interface IUserResourceResponse {
  [userResourceId: string]: IUserResourceFrontEnd;
}
