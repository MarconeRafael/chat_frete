// whatsappClient.js
// Este módulo é responsável por inicializar e gerenciar o cliente do WhatsApp utilizando o whatsapp-web.js.
// Ele conecta ao WhatsApp, gerencia sessões, ouve eventos de mensagens e encaminha as mensagens para o fluxo de lógica.

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');

// Callback que deverá ser definido pelo fluxo de lógica para processar as mensagens recebidas.
let messageCallback = null;

/**
 * Inicializa o cliente do WhatsApp e trata a autenticação e conexão.
 * @param {Function} onMessageCallback - Função callback para tratar as mensagens recebidas.
 */
function initializeClient(onMessageCallback) {
  // Define o callback para processamento das mensagens
  messageCallback = onMessageCallback;

  // Inicializa o cliente com autenticação local (sessão salva localmente)
  const client = new Client({
    authStrategy: new LocalAuth()
  });

  // Geração do QR Code para autenticação
  client.on('qr', (qr) => {
    console.log('QR RECEIVED, escaneie com seu WhatsApp:');
    qrcode.generate(qr, { small: true });
  });

  // Quando o cliente estiver autenticado e pronto
  client.on('ready', () => {
    console.log('Cliente WhatsApp pronto!');
  });

  // Captura de mensagens recebidas e encaminhamento para o callback de processamento
  client.on('message', (message) => {
    onMessageReceived(message);
  });

  // Lida com erros e desconexões
  client.on('auth_failure', (msg) => {
    console.error('Falha na autenticação:', msg);
  });

  client.on('disconnected', (reason) => {
    console.log('Cliente desconectado:', reason);
  });

  // Inicializa o cliente
  client.initialize();

  // Retorna o cliente caso seja necessário para outras operações
  return client;
}

/**
 * Callback para tratar cada mensagem recebida.
 * Encaminha a mensagem para o callback definido no fluxo de lógica.
 * @param {Object} message - Objeto da mensagem recebida.
 */
function onMessageReceived(message) {
  console.log('Mensagem recebida de:', message.from);
  console.log('Conteúdo:', message.body);

  // Verifica se o callback foi definido e encaminha a mensagem para ele
  if (typeof messageCallback === 'function') {
    messageCallback(message);
  } else {
    console.warn('Callback para processamento de mensagem não foi definido.');
  }
}

module.exports = {
  initializeClient,
  onMessageReceived
};
