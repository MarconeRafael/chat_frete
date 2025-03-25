// freteLogic.js
// Este módulo implementa a lógica de negócio do fluxo de negociação do frete.
// Ele gerencia desde o interesse inicial, solicitando o tamanho do caminhão, verificando a capacidade,
// oferecendo preço e tratando as respostas do caminhoneiro para encaminhar os dados do frete ou encerrar a conversa.

// Importa configurações e, se necessário, serviços auxiliares.
const config = require('./config');
// const openaiService = require('./openaiService'); // Pode ser utilizado para análise avançada de respostas

// Objeto para manter o estado da conversa (em memória, chaveado pelo número do caminhoneiro)
const conversationState = {};

/**
 * Função principal para gerenciar o fluxo de negociação do frete.
 * @param {Object} message - Objeto da mensagem recebida.
 * @param {Function} sendMessage - Função callback para enviar mensagens, recebe (destinatário, mensagem).
 */
function processarMensagem(message, sendMessage) {
  const sender = message.from;

  // Se não houver estado salvo para o remetente, inicia uma nova conversa.
  if (!conversationState[sender]) {
    // Verifica se a mensagem indica interesse em frete.
    if (message.body.toLowerCase().includes('frete')) {
      // Inicializa o estado da conversa com informações básicas.
      conversationState[sender] = {
        stage: 'aguardandoTamanho',
        frete: {}, // Pode ser preenchido com detalhes do frete se disponíveis.
        caminhoneiro: { contato: sender }
      };
      sendMessage(sender, "Olá! Qual o tamanho do seu caminhão? (Ex.: P, M ou G)");
    } else {
      // Caso a mensagem não seja de interesse, responde de forma genérica.
      sendMessage(sender, "Olá, como posso ajudar?");
    }
    return;
  }

  // Recupera o estado atual da conversa para o remetente.
  const state = conversationState[sender];

  switch (state.stage) {
    case 'aguardandoTamanho': {
      // Recebe o tamanho do caminhão.
      const tamanhoCaminhao = message.body.trim();
      state.tamanhoCaminhao = tamanhoCaminhao;

      // Verifica se o frete cabe no caminhão.
      if (verificarCapacidade(state.frete, tamanhoCaminhao)) {
        // Se couber, calcula o preço e solicita aceite.
        state.stage = 'aguardandoAceitePreco';
        const preco = oferecerPreco(state.frete, tamanhoCaminhao);
        state.precoOferta = preco;
        sendMessage(sender, `O frete cabe no seu caminhão. O preço é R$ ${preco}. Você aceita?`);
      } else {
        // Se não couber, encerra a conversa.
        sendMessage(sender, "Infelizmente, o frete não cabe no seu caminhão. Obrigado pelo contato!");
        delete conversationState[sender];
      }
      break;
    }
    case 'aguardandoAceitePreco': {
      // Análise simples da resposta do caminhoneiro.
      const resposta = message.body.toLowerCase();

      if (resposta.includes('sim')) {
        // Caminhoneiro aceita a oferta.
        encaminharContato(state.frete, state.caminhoneiro);
        sendMessage(sender, "Obrigado! Encaminhamos seu contato e as informações do frete.");
        delete conversationState[sender];
      } else if (resposta.includes('valor') || resposta.includes('preço')) {
        // Caminhoneiro comenta sobre o valor.
        state.stage = 'aguardandoRespostaComentario';
        // Aplica acréscimo de 10% conforme a configuração.
        const precoComAcrescimo = state.precoOferta * (1 + config.negotiation.acrescimoPercentual / 100);
        state.precoOferta = precoComAcrescimo;
        sendMessage(sender, `Podemos ajustar o valor com um acréscimo de 10%. O novo preço é R$ ${precoComAcrescimo}. Você aceita?`);
      } else if (resposta.includes('não')) {
        // Caminhoneiro rejeita a oferta.
        sendMessage(sender, "Tudo bem, obrigado pelo seu tempo. Até a próxima!");
        delete conversationState[sender];
      } else {
        // Se a resposta for ambígua, solicita uma resposta clara.
        sendMessage(sender, "Não entendi sua resposta. Por favor, informe se você aceita a oferta (sim/não) ou comente sobre o preço.");
      }
      break;
    }
    case 'aguardandoRespostaComentario': {
      // Tratamento da resposta após a oferta com acréscimo.
      const resposta = message.body.toLowerCase();
      if (resposta.includes('sim')) {
        encaminharContato(state.frete, state.caminhoneiro);
        sendMessage(sender, "Obrigado! Encaminhamos seu contato e as informações do frete.");
        delete conversationState[sender];
      } else if (resposta.includes('não')) {
        // Pergunta qual é a contraproposta.
        state.stage = 'aguardandoProposta';
        sendMessage(sender, "Entendi. Qual é a sua proposta?");
      } else {
        sendMessage(sender, "Por favor, responda com 'sim' ou 'não' à nova oferta.");
      }
      break;
    }
    case 'aguardandoProposta': {
      // Recebe a proposta do caminhoneiro.
      state.proposta = message.body.trim();
      encaminharContato(state.frete, state.caminhoneiro, state.proposta);
      sendMessage(sender, "Obrigado! Encaminhamos sua proposta e as informações do frete.");
      delete conversationState[sender];
      break;
    }
    default:
      // Caso ocorra algum estado desconhecido, encerra a conversa.
      sendMessage(sender, "Ocorreu um erro. Por favor, inicie a conversa novamente.");
      delete conversationState[sender];
      break;
  }
}

/**
 * Função para calcular e retornar o preço do frete com base no frete e no tamanho do caminhão.
 * @param {Object} frete - Objeto contendo informações do frete.
 * @param {string} tamanhoCaminhao - Tamanho do caminhão informado.
 * @returns {number} - Preço calculado.
 */
function oferecerPreco(frete, tamanhoCaminhao) {
  // Exemplo simplificado: preço fixo.
  const precoBase = 1000; // valor base do frete
  // Pode-se ajustar o preço com base no tamanho ou outros parâmetros.
  return precoBase;
}

/**
 * Função para encaminhar o contato e as informações do frete para o número destino.
 * @param {Object} frete - Objeto contendo informações do frete.
 * @param {Object} caminhoneiro - Objeto contendo informações do caminhoneiro.
 * @param {string} [proposta] - (Opcional) Proposta do caminhoneiro, se houver.
 */
function encaminharContato(frete, caminhoneiro, proposta = null) {
  // Aqui a lógica para encaminhar os dados para o número destino (config.whatsapp.numeroDestino).
  // Por exemplo, montar uma mensagem formatada e enviar via WhatsApp.
  console.log("Encaminhando dados para o número destino...");
  console.log("Frete:", frete);
  console.log("Caminhoneiro:", caminhoneiro);
  if (proposta) {
    console.log("Proposta do caminhoneiro:", proposta);
  }
  // Implemente o envio real de mensagem conforme sua necessidade.
}

/**
 * Função para verificar se o frete cabe no caminhão.
 * @param {Object} frete - Objeto contendo informações do frete.
 * @param {string} tamanhoCaminhao - Tamanho do caminhão informado.
 * @returns {boolean} - True se o frete couber, false caso contrário.
 */
function verificarCapacidade(frete, tamanhoCaminhao) {
  // Lógica simplificada: vamos supor que frete cabe se o caminhão for tamanho 'M' ou 'G'.
  return tamanhoCaminhao.toUpperCase() === 'M' || tamanhoCaminhao.toUpperCase() === 'G';
}

module.exports = {
  processarMensagem,
  oferecerPreco,
  encaminharContato,
  verificarCapacidade
};
