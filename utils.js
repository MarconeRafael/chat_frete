const fs = require('fs');
const { spawn } = require('child_process');
const { createReadStream } = require('fs');
const { OpenAI } = require('openai');
const config = require('./config');

const openai = new OpenAI({
  apiKey: config.openaiApiKey,
});

// Função para extrair informações de mensagens, incluindo áudio
async function extrairInformacoes(mensagem) {
  console.log(`Mensagem recebida de ${mensagem.from}: ${mensagem.body}`);

  if (mensagem.hasMedia && mensagem.mimetype && mensagem.mimetype.startsWith('audio')) {
    console.log('Áudio detectado. Iniciando o processo de transcrição.');
    
    const media = await mensagem.downloadMedia();
    const audioOggPath = `temp_${Date.now()}.ogg`;

    console.log('Baixando áudio...');
    fs.writeFileSync(audioOggPath, media.data, { encoding: 'base64' });
    console.log(`Áudio salvo como ${audioOggPath}`);

    const transcricao = await transcreverAudio(audioOggPath, mensagem);
    
    if (transcricao) {
      console.log('Transcrição concluída:', transcricao);
    } else {
      console.log('Falha na transcrição.');
    }

    fs.unlinkSync(audioOggPath); // Excluindo o arquivo temporário
    return { tipo: 'audio', conteudo: transcricao };
  } else {
    console.log('Mensagem de texto recebida');
    return { tipo: 'texto', conteudo: mensagem.body };
  }
}

// Função para converter áudio OGG para WAV e transcrever com OpenAI
async function transcreverAudio(audioOggPath, message) {
  console.log(`Iniciando a transcrição do áudio: ${audioOggPath}`);
  const audioWavPath = audioOggPath.replace('.ogg', '.wav');

  if (!fs.existsSync(audioOggPath)) {
    console.error(`Arquivo OGG não encontrado: ${audioOggPath}`);
    if (message?.reply) {
      message.reply(`Arquivo ${audioOggPath} não encontrado!`);
    }
    return '';
  }

  try {
    console.log('Iniciando conversão de OGG para WAV...');
    await new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-i', audioOggPath,
        '-ar', '16000',
        '-ac', '1',
        '-c:a', 'pcm_s16le',
        audioWavPath
      ]);
      ffmpeg.on('close', (code) => {
        if (code === 0) {
          console.log('Áudio convertido para WAV com sucesso');
          resolve();
        } else {
          console.error(`Erro na conversão do áudio. Código de saída: ${code}`);
          reject(new Error(`FFmpeg terminou com código ${code}`));
        }
      });
    });
  } catch (error) {
    console.error(`Erro na conversão do áudio: ${error.message}`);
    if (message?.reply) {
      message.reply(`Erro na conversão do áudio: ${error.message}`);
    }
    return '';
  }

  if (!fs.existsSync(audioWavPath)) {
    console.error(`Erro: o arquivo ${audioWavPath} não foi gerado.`);
    if (message?.reply) {
      message.reply(`Erro na conversão! Arquivo ${audioWavPath} não foi gerado.`);
    }
    return '';
  }

  try {
    console.log(`Enviando para transcrição da OpenAI: ${audioWavPath}`);
    const response = await openai.audio.transcriptions.create({
      file: createReadStream(audioWavPath),
      model: 'whisper-1',
    });

    const transcricao_texto = response.text;
    console.log(`Transcrição recebida: ${transcricao_texto}`);

    if (message?.reply) {
      message.reply(`Transcrição: ${transcricao_texto}`);
    }
    fs.unlinkSync(audioWavPath); // Excluindo o arquivo WAV temporário
    return transcricao_texto;
  } catch (error) {
    console.error(`Erro na transcrição do áudio: ${error.message}`);
    if (message?.reply) {
      message.reply(`Erro na transcrição do áudio: ${error.message}`);
    }
    return '';
  }
}

module.exports = {
  extrairInformacoes,
  transcreverAudio
};
