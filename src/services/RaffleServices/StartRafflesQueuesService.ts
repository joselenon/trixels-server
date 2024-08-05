import { RabbitMQInstance } from '../..';
import RaffleUtils from './RaffleUtils';
import ProcessRaffleQueueService from './ProcessRaffleQueueService';

export default async function StartRafflesQueuesService() {
  const raffleInRedis = await RaffleUtils.getAllRaffles();
  const { activeRaffles } = raffleInRedis;

  // Verifica se cada raffle possui uma fila e cria se necessário
  for (const raffle of activeRaffles) {
    const queueName = `raffle:${raffle.gameId}`;

    const queueAlreadyExists = await RabbitMQInstance.queueAlreadyExists(queueName);

    if (queueAlreadyExists) {
      console.log(`Queue ${queueName} already exists.`);
    } else {
      console.log(`Creating queue ${queueName}.`);
      await RabbitMQInstance.createQueue(queueName);
    }

    await RabbitMQInstance.consumeMessages(queueName, new ProcessRaffleQueueService(raffle).start);
  }

  console.log('Raffles Services Initialized.');
}
