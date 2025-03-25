// openaiService.js
// Este módulo integra a API da OpenAI para auxiliar na análise de mensagens e na geração de respostas customizadas.
// Possíveis usos:
// - analisarResposta(mensagem): envia o conteúdo da mensagem para a API e retorna um objeto com a interpretação (ex.: { tipo: "aceite" }).
// - gerarRespostaCustomizada(contexto): gera uma resposta mais natural baseada no contexto da conversa.

const { Configuration, OpenAIApi } = require("openai");
const config = require('./config');

// Configuração da API da OpenAI usando a chave definida em config.js
const configuration = new Configuration({
  apiKey: config.openaiApiKey,
});
const openai = new OpenAIApi(configuration);

/**
 * Analisa a mensagem do caminhoneiro e classifica a resposta.
 * @param {string} mensagem - Mensagem a ser analisada.
 * @returns {Promise<Object>} - Objeto com a interpretação, por exemplo: { tipo: "aceite", detalhes: "" }.
 */
async function analisarResposta(mensagem) {
  // Monta o prompt para a API da OpenAI
  const prompt = `
Analise a seguinte mensagem do caminhoneiro e retorne um objeto JSON com a classificação da resposta.
Os possíveis valores para "tipo" são:
- "aceite" para aceitar a oferta.
- "comentario" se o caminhoneiro comentar ou questionar o preço.
- "rejeicao" para rejeitar a oferta.
Caso haja detalhes adicionais, inclua em "detalhes".

Mensagem: "${mensagem}"
Formato do JSON:
{
  "tipo": string,
  "detalhes": string
}
`;
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.3,
    });
    
    const respostaTexto = response.data.choices[0].text.trim();
    let resultado = {};
    try {
      resultado = JSON.parse(respostaTexto);
    } catch (error) {
      // Se não conseguir parsear JSON, retorna a resposta bruta no campo detalhes
      resultado = { tipo: respostaTexto, detalhes: "" };
    }
    return resultado;
  } catch (error) {
    console.error("Erro ao analisar resposta com OpenAI:", error);
    return null;
  }
}

/**
 * Gera uma resposta customizada com base no contexto fornecido.
 * @param {string} contexto - Informações de contexto para gerar a resposta.
 * @returns {Promise<string>} - Resposta gerada pela OpenAI.
 */
async function gerarRespostaCustomizada(contexto) {
  const prompt = `Com base no seguinte contexto: "${contexto}", gere uma resposta natural e adequada para o caminhoneiro.`;
  try {
    const response = await openai.createCompletion({
      model: "text-davinci-003",
      prompt: prompt,
      max_tokens: 100,
      temperature: 0.7,
    });
    return response.data.choices[0].text.trim();
  } catch (error) {
    console.error("Erro ao gerar resposta customizada com OpenAI:", error);
    return "";
  }
}

module.exports = {
  analisarResposta,
  gerarRespostaCustomizada,
};
