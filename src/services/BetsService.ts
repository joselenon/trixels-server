import { FirebaseInstance } from '..';
import { UnknownError } from '../config/errors/classes/SystemErrors';
import { IBetInDB, IBetToFrontEnd } from '../config/interfaces/IBet';
import { TDBGamesCollections } from '../config/interfaces/IFirebase';
import { IUser } from '../config/interfaces/IUser';

class BetsService {
  async makeBetObjToFrontEnd(betInDb: IBetInDB, betId: string): Promise<IBetToFrontEnd> {
    const { gameRef, userRef, amountBet, createdAt, info, prize } = betInDb;

    const gameId = gameRef.id;

    const getUserInfo = async (): Promise<IBetToFrontEnd['userRef'] | undefined> => {
      const userDocId = userRef.id;
      const userInDb = await FirebaseInstance.getDocumentById<IUser>('users', userDocId);

      if (userInDb) {
        const { avatar, username } = userInDb.docData;
        return { avatar, username, userId: userDocId };
      }
    };

    const filteredUserRef = await getUserInfo();
    if (!filteredUserRef) throw new UnknownError('ERROR WITH BETTER INFO');

    return { gameId, amountBet, createdAt, info, prize, userRef: filteredUserRef, betId };
  }

  /* Checar se realmente é necessário criar um documento em bets para criação de raffles */
  async makeBetObjToDb(betOptions: {
    userRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    gameRef: FirebaseFirestore.DocumentReference<FirebaseFirestore.DocumentData, FirebaseFirestore.DocumentData>;
    gameType: TDBGamesCollections;
    amountBet: number;
  }) {
    const { amountBet, gameRef, gameType, userRef } = betOptions;

    const nowTime = Date.now();

    const betObjToDb: IBetInDB = {
      createdAt: nowTime,
      amountBet,
      info: { randomTicket: true, tickets: [], type: gameType },
      prize: 0,
      gameRef,
      userRef,
    };

    return betObjToDb;
  }
}

export default new BetsService();
