const whatsappClient = require('./whatsappClient');
const freteLogic = require('./freteLogic');
const utils = require('./utils');
const config = require('./config');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

let client;

// Função para enviar mensagens
function sendMessage(to, message) {
  client.sendMessage(to, message)
    .then(response => {
      console.log('Mensagem enviada com sucesso');
      console.log(`Mensagem enviada para ${to}: ${message}`);  // Imprime a mensagem enviada no terminal
    })
    .catch(err => console.error('Erro ao enviar mensagem:', err));
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
      language: 'pt'  // Definindo idioma como português (Brasil)
    });

    // Log da resposta
    console.log('Resposta da OpenAI:', response);

    if (response && response.text) {
      console.log('Áudio transcrito com sucesso!');
      return response.text;
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
    // Verifica se a mensagem é de áudio
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

// Inicializa o cliente do WhatsApp e passa a função processMessage
client = whatsappClient.initializeClient(processMessage);

console.log("Sistema de negociação de frete iniciado...");
