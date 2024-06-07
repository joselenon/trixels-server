import amqp from 'amqplib/callback_api';

interface RabbitMQServiceOptions {
  host: string;
  port: number;
  username: string;
  password: string;
}

export default class RabbitMQService {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;
  private options: RabbitMQServiceOptions;

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

      this.channel = channel;
      console.log('Canal criado');
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

  async sendMessage(queueName: string, message: string): Promise<void> {
    await this.ensureChannel();

    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    // Enviar mensagem para a fila
    await this.channel.assertQueue(queueName, { durable: false });
    this.channel.sendToQueue(queueName, Buffer.from(message));
  }

  async consumeMessages(queueName: string, callback: (message: string) => void): Promise<void> {
    await this.ensureChannel();

    if (!this.channel) {
      throw new Error('Channel unreached.');
    }

    // Consumir mensagens da fila
    await this.channel.assertQueue(queueName, { durable: false });
    this.channel.consume(queueName, (message) => {
      if (message) {
        callback(message.content.toString());
        this.channel?.ack(message); // Confirmação da mensagem
      }
    });
  }

  async closeConnection(): Promise<void> {
    if (this.connection) {
      await this.connection.close();
      console.log('Conexão fechada com o RabbitMQ');
    }
  }
}
