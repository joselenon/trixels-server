import fs from 'fs';
import path from 'path';
import { FirebaseInstance } from '..';
import { IUserResourceFirebase } from '../config/interfaces/IUserResources';

export default async function SubirJSONParaFirebase() {
  const fileName = 'JOSELENON_timer.json';
  const filePath = path.resolve(__dirname, '../assets', fileName);

  const data = fs.readFileSync(filePath, 'utf-8');

  const doit = 2;
  try {
    if (doit === 1) {
      const jsonData: {
        [id: string]: {
          resourceName: string;
          cooldown: number;
          landNumber: number;
          startTime: number;
          acc: string;
        };
      } = JSON.parse(data);

      const keys = Object.keys(jsonData);

      const userId = '7ulTdNnojgJV0mAf52cP';
      const userInDb = await FirebaseInstance.getDocumentById('users', userId);

      if (userInDb) {
        const userRef = (await FirebaseInstance.getDocumentRef('users', userInDb.docId))
          .result;

        for (const key of keys) {
          const { landNumber, resourceName } = jsonData[key];
          const firebaseObj: IUserResourceFirebase = {
            landNumber,
            resourceName,
            userRef,
          };

          await FirebaseInstance.writeDocument('usersResources', firebaseObj);
        }
      }
    }
  } catch (err) {
    console.log(err);
  }
}
