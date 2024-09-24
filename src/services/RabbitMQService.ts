import amqp from 'amqplib/callback_api';
import { v4 as uuidv4 } from 'uuid';
import { ClientError, ClientErrorMap } from '../config/errors/classes/ClientErrors';
import { SystemError, UnknownError } from '../config/errors/classes/SystemErrors';

interface RabbitMQServiceOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

type TRabbitMQQueues = 'balanceUpdateQueue' | 'evenRafflesQueue' | 'oddRafflesQueue' | 'redemptionCodeQueue';

interface IRPCResponse<DataReturned> {
  authorized: boolean;
  fnReturnedData: DataReturned | null;
  errorProps?: { type: 'Client Error' | 'System Error'; name: string; status: number };
}

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

        this.connection.on('error', (error) => {
          console.error('Connection error:', error);
          this.connection = null;
          this.channel = null;
        });

        this.createChannel();
      },
    );
  }

  checkForErrorsAfterRPC(rpcResponse: IRPCResponse<any>) {
    const { authorized, errorProps } = rpcResponse;

    if (!authorized) {
      if (errorProps && errorProps.type === 'Client Error') {
        const ErrorMapped = ClientErrorMap[errorProps.name];
        if (ErrorMapped) {
          throw new ErrorMapped();
        }
      }

      throw new UnknownError(`Something went wrong: ${errorProps}`);
    }
  }

  public async queueAlreadyExists(queueName: string) {
    try {
      if (!this.channel) {
        console.error('Channel is not available.');
        return;
      }

      await this.channel.assertQueue(queueName);
      return true;
    } catch (error) {
      return false;
    }
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

    this.channel.assertQueue('', { exclusive: true }, (error, q) => {
      if (error) {
        console.error('Failed to create reply queue:', error);
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

  async createQueue(queueName: TRabbitMQQueues | string): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const { queueOptions } = this.getMessageAndQueueOptions(queueName);

    this.channel.assertQueue(queueName, queueOptions);
  }

  async deleteQueue(queueName: TRabbitMQQueues | string): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    this.channel.deleteQueue(queueName);
  }

  getMessageAndQueueOptions(queueName: string): {
    queueOptions: amqp.Options.AssertQueue;
    messageOptions: amqp.Options.Publish;
  } {
    if (queueName === 'balanceUpdateQueue') {
      return { queueOptions: { durable: true }, messageOptions: { persistent: true } };
    }
    if (queueName.includes('raffle:')) {
      return { queueOptions: { durable: true }, messageOptions: { persistent: true } };
    }

    return { queueOptions: {}, messageOptions: {} };
  }

  async sendMessage(queueName: TRabbitMQQueues | string, message: any): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const { messageOptions, queueOptions } = this.getMessageAndQueueOptions(queueName);

    const messageToJSON = JSON.stringify(message);

    // Enviar mensagem para a fila
    this.channel.assertQueue(queueName, queueOptions);
    this.channel.sendToQueue(queueName, Buffer.from(messageToJSON), messageOptions);
  }

  /* DataReturned refers to the data the callback function will return */
  async sendRPCMessage<DataReturned>(
    queueName: TRabbitMQQueues | string,
    message: any,
  ): Promise<IRPCResponse<DataReturned>> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const correlationId = uuidv4();
    const messageToJSON = JSON.stringify(message);

    const { queueOptions, messageOptions } = this.getMessageAndQueueOptions(queueName);

    const rpcMessageOptions: amqp.Options.Publish = {
      correlationId,
      replyTo: this.replyQueue!,
      ...messageOptions,
    };

    return new Promise((resolve) => {
      this.responses.set(correlationId, (msg) => {
        if (msg) {
          const content = JSON.parse(msg.content.toString());
          resolve(content);
        } else {
          resolve({ authorized: false, fnReturnedData: null });
        }
      });

      this.channel?.assertQueue(queueName, queueOptions);
      this.channel?.sendToQueue(queueName, Buffer.from(messageToJSON), rpcMessageOptions);
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

  /* ATTENTION: The callback must do the parse of the message */
  async consumeMessages(
    queueName: TRabbitMQQueues | string,
    callback: (message: string) => Promise<any>,
  ): Promise<void> {
    await this.ensureChannel();
    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    const { queueOptions } = this.getMessageAndQueueOptions(queueName);

    this.channel.prefetch(1);
    this.channel.assertQueue(queueName, queueOptions);
    this.channel.consume(queueName, async (message) => {
      if (message) {
        const content = message.content.toString();
        const correlationId = message.properties.correlationId;

        try {
          const fnReturnedData = await callback(content);
          this.channel?.ack(message);

          if (correlationId) {
            this.sendReplyMessage({ authorized: true, fnReturnedData }, correlationId);
          }
        } catch (error: any) {
          if (error instanceof ClientError) {
            this.channel?.nack(message, false, false); // don't requeue the message
          }

          /* Adaptar a partir das subinstâncias de erros */
          if (error instanceof SystemError) {
            this.channel?.nack(message, false, false); // don't requeue the message
          }

          if (correlationId) {
            this.sendReplyMessage(
              {
                authorized: false,
                fnReturnedData: null,
                errorProps: { name: error.name, type: error.type, status: error.status },
              } as IRPCResponse<null>,
              correlationId,
            );
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
