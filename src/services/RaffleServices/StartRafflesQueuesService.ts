import { RabbitMQInstance } from '../..';
import RaffleUtils from './RaffleUtils';
import ProcessRaffleQueueService from './ProcessRaffleQueueService';

export default async function StartRafflesQueuesService() {
  const raffleCache = await RaffleUtils.syncRaffles();
  const { activeRaffles } = raffleCache;

  // Verifica se cada raffle possui uma fila e cria se necessário
  for (const raffle of activeRaffles) {
    const queueName = `raffle:${raffle.gameId}`;

    const instance = new ProcessRaffleQueueService(raffle.gameId);
    await RabbitMQInstance.consumeMessages(queueName, instance.consume);
  }

  console.log('Raffles Services Initialized.');
}
