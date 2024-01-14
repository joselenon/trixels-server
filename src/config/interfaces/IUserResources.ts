import * as admin from 'firebase-admin';

export interface IResourceInfoCreationPayload {
  resourceName: string;
  cooldown: number;
  landNumber: number;
  startTime: number;
  acc: string;
}

export interface IUserResourceFirebase {
  resourceName: string;
  landNumber: number;
  userRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;
}

export interface IUserResourceFrontEnd {
  resourceName: string;
  landNumber: number;
  startTime?: number;
}

export interface IUserResourcesRedis {
  [resourceId: string]: IUserResourceFrontEnd;
}

export interface IUserResourceResponse {
  [userResourceId: string]: IUserResourceFrontEnd;
}
