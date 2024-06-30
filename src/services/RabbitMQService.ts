import amqp from 'amqplib/callback_api';
import { v4 as uuidv4 } from 'uuid';
import { ClientError } from '../config/errors/classes/ClientErrors';
import { SystemError } from '../config/errors/classes/SystemErrors';

interface RabbitMQServiceOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

type TRabbitMQQueues = 'balanceUpdateQueue' | 'evenRafflesQueue' | 'oddRafflesQueue';

export default class RabbitMQService {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private options: RabbitMQServiceOptions;
  private replyQueue: string | null = null;
  private responses: Map<string, (msg: amqp.Message | null) => void> = new Map();

  constructor(options: RabbitMQServiceOptions) {
    this.options = options;
    this.connect();
  }

  private connect() {
    const { host, port, username, password } = this.options;

    amqp.connect(
      `amqp://${username}:${password}@${host}:${port}`,
      (error: Error | null, connection: amqp.Connection | null) => {
        if (error || !connection) {
          console.error('Error trying to connect to RabbitMQ: ', error);
          setTimeout(() => this.connect(), 5000); // Retry after a delay
          return;
        }

        console.log('RabbitMQ Initialized.');

        this.connection = connection;

        this.connection.on('close', () => {
          console.error('Connection closed. Reconnecting...');
          this.connection = null;
          this.channel = null;
          this.connect();
        });

        this.connection.on('error', (err) => {
          console.error('Connection error:', err);
          this.connection = null;
          this.channel = null;
        });

        this.createChannel();
      },
    );
  }

  private createChannel() {
    if (!this.connection) return;

    this.connection.createChannel((error: Error | null, channel: amqp.Channel | null) => {
      if (error) {
        console.error('Error while creating channel:', error);
        setTimeout(() => this.createChannel(), 5000); // Retry after a delay
        return;
      }

      this.channel = channel!;
      this.setupReplyQueue();
    });
  }

  private setupReplyQueue() {
    if (!this.channel) {
      console.error('Channel is not available.');
      return;
    }

    this.channel.assertQueue('', { exclusive: true }, (err, q) => {
      if (err) {
        console.error('Failed to create reply queue:', err);
        return;
      }

      this.replyQueue = q.queue;
      console.log('Reply queue Initialized. - ', this.replyQueue);

      this.channel!.consume(
        this.replyQueue,
        (msg) => {
          if (msg && msg.properties.correlationId) {
            const correlationId = msg.properties.correlationId;
            const resolve = this.responses.get(correlationId);

            if (resolve) {
              resolve(msg);
              this.responses.delete(correlationId);
            }
          }
        },
        { noAck: true },
      );
    });
  }

  private async ensureChannel() {
    if (!this.channel) {
      console.error('Channel is not available. Reconnecting...');
      await new Promise<void>((resolve) => {
        const interval = setInterval(() => {
          if (this.channel) {
            clearInterval(interval);
            resolve();
          }
        }, 1000);
      });
    }
  }

  async createQueue(queueName: TRabbitMQQueues, queueOptions: amqp.Options.AssertQueue = {}): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    this.channel.assertQueue(queueName, queueOptions);
  }

  async deleteQueue(queueName: TRabbitMQQueues): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    this.channel.deleteQueue(queueName);
  }

  async sendMessage(queueName: TRabbitMQQueues, message: any): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const messageToJSON = JSON.stringify(message);

    const queueOptions: amqp.Options.AssertQueue = {};
    if (queueName === 'balanceUpdateQueue') {
      queueOptions['durable'] = true;
    }

    const messageOptions: amqp.Options.Publish = {};
    if (queueName === 'balanceUpdateQueue') {
      messageOptions['persistent'] = true;
    }

    // Enviar mensagem para a fila
    this.channel.assertQueue(queueName, queueOptions);
    this.channel.sendToQueue(queueName, Buffer.from(messageToJSON), messageOptions);
  }

  async sendRPCMessage(queueName: TRabbitMQQueues, message: any): Promise<any> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const correlationId = uuidv4();
    const messageToJSON = JSON.stringify(message);

    const queueOptions: amqp.Options.AssertQueue = {};
    if (queueName === 'balanceUpdateQueue') {
      queueOptions['durable'] = true;
    }

    const messageOptions: amqp.Options.Publish = {
      correlationId,
      replyTo: this.replyQueue!,
      persistent: queueName === 'balanceUpdateQueue' ? true : false,
    };

    return new Promise((resolve) => {
      this.responses.set(correlationId, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          resolve(content);
        } else {
          resolve(null);
        }
      });

      // Enviar mensagem para a fila com propriedades de RPC
      this.channel?.assertQueue(queueName, queueOptions);
      this.channel?.sendToQueue(queueName, Buffer.from(messageToJSON), messageOptions);
    });
  }

  async sendReplyMessage(message: any, correlationId: string): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const messageToJSON = JSON.stringify(message);

    if (!this.replyQueue) {
      throw new Error('Reply queue is not initialized.');
    }

    this.channel.sendToQueue(this.replyQueue, Buffer.from(messageToJSON), {
      correlationId,
    });
  }

  async consumeMessages(queueName: TRabbitMQQueues, callback: (message: string) => Promise<void>): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const queueOptions: amqp.Options.AssertQueue = {};
    if (queueName === 'balanceUpdateQueue') {
      queueOptions['durable'] = true;
    }

    this.channel.prefetch(1);
    this.channel.assertQueue(queueName, queueOptions);
    this.channel.consume(queueName, async (message) => {
      if (message) {
        const content = message.content.toString();
        const correlationId = message.properties.correlationId;

        try {
          await callback(content);
          this.channel?.ack(message);

          if (correlationId) {
            this.sendReplyMessage({ authorized: true }, correlationId);
          }
        } catch (err) {
          if (err instanceof ClientError) {
            this.channel?.nack(message, false, false); // don't requeue the message
          }

          /* Adaptar a partir das subinstâncias de erros */
          if (err instanceof SystemError) {
            this.channel?.nack(message, false, false); // don't requeue the message
          }

          if (correlationId) {
            this.sendReplyMessage({ authorized: false }, correlationId);
          }
        }
      }
    });
  }

  async closeConnection(): Promise<void> {
    if (this.connection) {
      this.connection.close();
      console.log('Conexão fechada com o RabbitMQ');
    }
  }
}
