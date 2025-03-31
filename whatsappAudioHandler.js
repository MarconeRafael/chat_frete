const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');
const whatsappClient = require('./whatsappClient');
const freteLogic = require('./freteLogic');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Função para corrigir possíveis erros de transcrição
function corrigirTranscricao(texto) {
  // Dicionário de substituição: chave é o termo incorreto (em minúsculas) e valor é o termo correto
  const correcoes = {
    'frets': 'frete',
    'fret': 'frete',
    'friends': 'fretes',
    'fred': 'fretes',
    // Adicione outros termos conforme necessário
  };

  // Separa o texto em palavras e faz a substituição
  let palavras = texto.split(' ');
  palavras = palavras.map(palavra => {
    // Remove pontuações para comparar apenas a palavra
    const palavraLimpa = palavra.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (correcoes[palavraLimpa]) {
      // Substitui a parte encontrada preservando pontuações se houver
      return palavra.replace(new RegExp(palavraLimpa, 'i'), correcoes[palavraLimpa]);
    }
    return palavra;
  });
  return palavras.join(' ');
}

async function transcreverAudio(audioFilePath) {
  try {
    console.log(`Iniciando transcrição do áudio em: ${audioFilePath}`);
    
    // Verifica se o arquivo existe
    if (!fs.existsSync(audioFilePath)) {
      console.error('Arquivo de áudio não encontrado!');
      return null;
    }

    // Converte o arquivo OGG para WAV se necessário
    const wavFilePath = audioFilePath.replace('.ogg', '.wav');
    if (!fs.existsSync(wavFilePath)) {
      console.log('Convertendo áudio de OGG para WAV...');
      await new Promise((resolve, reject) => {
        const ffmpeg = require('child_process').spawn('ffmpeg', [
          '-i', audioFilePath,
          '-ar', '16000',  // Frequência de amostragem
          '-ac', '1',      // Canal mono
          '-c:a', 'pcm_s16le', // Codec para WAV
          wavFilePath
        ]);
        ffmpeg.on('close', (code) => {
          if (code === 0) {
            console.log('Áudio convertido para WAV com sucesso');
            resolve();
          } else {
            reject(new Error(`Erro na conversão de áudio: código ${code}`));
          }
        });
      });
    }

    // Envia o arquivo para a API de transcrição da OpenAI
    console.log('Enviando áudio para transcrição...');
    const response = await openai.audio.transcriptions.create({
      file: fs.createReadStream(wavFilePath),
      model: 'whisper-1',
      language: 'pt'  // Define o idioma para português
      // Se a API aceitar prompt, pode incluir um para contextualizar a conversa, por exemplo:
      // prompt: 'O áudio contém uma conversa sobre negociações de frete. Preste atenção em termos como "frete", "tamanho do caminhão", "aceita" ou "recusa".'
    });

    if (response && response.text) {
      console.log('Áudio transcrito com sucesso!');
      let textoCorrigido = corrigirTranscricao(response.text);
      console.log('Texto corrigido:', textoCorrigido);
      return textoCorrigido;
    } else {
      console.error('Erro na transcrição do áudio: resposta inválida.');
      return null;
    }
  } catch (error) {
    console.error('Erro ao transcrever áudio:', error);
    return null;
  }
}

async function processMessage(message) {
  console.log(`Mensagem recebida de: ${message.from}`);
  console.log(`Conteúdo: ${message.body}`);
  console.log('Tipo de mensagem:', message.type);

  try {
    // Verifica se a mensagem é de áudio ou PTT
    if (message.type === 'audio' || message.type === 'ptt') {
      console.log(`Mensagem de áudio/ptt recebida de ${message.from}`);
      console.log('Detalhes do áudio:', message.audioUrl);

      // Gerar nome único para o arquivo de áudio
      const audioFileName = `audio_${Date.now()}.ogg`;
      const audioFilePath = path.join(__dirname, audioFileName);
      const audioData = await message.downloadMedia();

      if (!audioData || !audioData.data) {
        console.error('Falha no download do áudio. Dados ausentes.');
        return;
      }

      console.log('Áudio baixado com sucesso, salvando...');

      // Salva o áudio localmente
      fs.writeFileSync(audioFilePath, audioData.data, { encoding: 'base64' });
      console.log(`Áudio salvo em: ${audioFilePath}`);

      // Transcreve o áudio
      const transcribedText = await transcreverAudio(audioFilePath);

      if (transcribedText) {
        console.log(`Texto transcrito: ${transcribedText}`);
        message.body = transcribedText; // Atualiza a mensagem com o texto transcrito
      } else {
        console.error('Falha na transcrição do áudio.');
        message.body = 'Desculpe, não consegui transcrever o áudio.';
      }

      // Deleta o arquivo temporário de áudio OGG
      fs.unlinkSync(audioFilePath);
    }

    // Após a transcrição (se houver), processa a mensagem
    freteLogic.processarMensagem(message, sendMessage);
  } catch (error) {
    console.error('Erro no processamento da mensagem:', error);
    sendMessage(message.from, 'Ocorreu um erro ao processar sua mensagem. Tente novamente mais tarde.');
  }
}

function sendMessage(to, text) {
  // Função para enviar mensagem via WhatsApp (ajuste conforme o seu cliente)
  client.sendMessage(to, text);
}

// Inicializa o cliente do WhatsApp e recebimento de mensagens
let client;
client = whatsappClient.initializeClient(processMessage);
console.log("Sistema de negociação de frete iniciado...");
