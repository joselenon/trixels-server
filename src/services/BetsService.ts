import { FirebaseInstance } from '..';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd } from '../config/interfaces/IBet';
import { TDBGamesCollections } from '../config/interfaces/IFirebase';
import { IUser } from '../config/interfaces/IUser';

class BetsService {
  async filterBetToFrontEnd({ betInDb }: { betInDb: IBetInDB }): Promise<IBetToFrontEnd> {
    const { gameRef, userRef } = betInDb;

    const gameId = gameRef.id;

    const getUserInfo = async (): Promise<IBetToFrontEnd['userRef'] | undefined> => {
      const userDocId = userRef.id;
      const docData = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);

      if (docData) {
        const { avatar, username } = docData.result;
        return { avatar, username, userId: userDocId };
      }
    };

    const filteredUserRef = await getUserInfo();
    if (!filteredUserRef) throw new UnknownError('ERROR WITH BETTER INFO');

    return { ...betInDb, gameId, userRef: filteredUserRef };
  }

  async createBet(betOptions: {
    userDocId: string;
    gameId: string;
    gameType: TDBGamesCollections;
    amountBet: number;
  }) {
    const { amountBet, gameId, gameType, userDocId } = betOptions;

    const nowTime = new Date().getTime();

    const gameRef = (await FirebaseInstance.getDocumentRef(gameType, gameId)).result;
    const userRef = (await FirebaseInstance.getDocumentRef('users', userDocId)).result;

    const betPayloadToDb: IBetInDB = {
      createdAt: nowTime,
      amountBet,
      info: { randomTicket: true, ticket: 25, type: gameType },
      prize: 0,
      gameRef,
      userRef,
    };

    await FirebaseInstance.writeDocument<IBetInDB>('bets', betPayloadToDb);
  }
}

export default new BetsService();
