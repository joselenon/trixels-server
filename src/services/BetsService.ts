import { IBetInDB, IBetToFrontEnd } from '../config/interfaces/IBet';
import { TDBGamesCollections } from '../config/interfaces/IFirebase';
import { IUser } from '../config/interfaces/IUser';

class BetsService {
  async filterBetObjToFrontend(betInDb: IBetInDB, betId: string): Promise<IBetToFrontEnd> {
    const { gameRef, userRef, amountBet, createdAt, info, prize } = betInDb;

    const gameId = gameRef.id;

    const getUserInfo = async (): Promise<IBetToFrontEnd['userRef']> => {
      const userDocId = userRef.id;
      const userInDb = (await userRef.get()).data() as IUser;

      if (userInDb) {
        const { avatar, username } = userInDb;
        return { avatar, username, userId: userDocId };
      } else {
        /* REVIEW */
        return { avatar: 'DELETED_USER', userId: 'DELETED_USER', username: 'DELETED_USER' };
      }
    };

    const filteredUserRef = await getUserInfo();
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
