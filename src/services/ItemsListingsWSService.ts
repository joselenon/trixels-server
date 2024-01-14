import { WebSocket } from 'ws';
import { fetchItemListings } from './PersistingItemListingsFetch';

class ItemsListingsWSService {
  private wss: WebSocket.Server;
  private itemConnections: Map<string, WebSocket> = new Map();

  constructor(server: any) {
    this.wss = new WebSocket.Server({ server });

    this.setupWebSocket();
  }

  private setupWebSocket(): void {
    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket connection established.');

      ws.on('message', (message: string) => {
        this.handleItemConnection(ws, message);
      });

      ws.on('close', () => {
        console.log('WebSocket connection closed.');
      });
    });
  }

  private async handleItemConnection(ws: WebSocket, itemName: string): Promise<void> {
    console.log(`Handling connection for item: ${itemName}`);

    // Se a conexão para o item já existir, feche-a antes de criar uma nova
    if (this.itemConnections.has(itemName)) {
      const existingConnection = this.itemConnections.get(itemName);
      if (existingConnection) {
        existingConnection.close();
      }
    }

    // Adicione a nova conexão ao Map
    this.itemConnections.set(itemName, ws);

    // Configura o intervalo para enviar dados a cada 5 segundos
    const fetchAndSendData = async () => {
      try {
        const data = await fetchItemListings(itemName);
        ws.send(JSON.stringify(data));
      } catch (error) {
        console.error(`Erro ao buscar listagens para ${itemName}:`, error);
      }
    };

    // Inicializa o intervalo
    const intervalId = setInterval(fetchAndSendData, 5000);

    // Adiciona o intervalo ao Map para posterior limpeza ao fechar a conexão
    this.itemConnections.set(itemName + '-interval', intervalId);

    // Ao fechar a conexão WebSocket, limpe o intervalo e remova do Map
    ws.on('close', () => {
      console.log(`WebSocket connection closed for item: ${itemName}`);
      clearInterval(intervalId);
      this.itemConnections.delete(itemName);
      this.itemConnections.delete(itemName + '-interval');
    });
  }
}

export default ItemsListingsWSService;
