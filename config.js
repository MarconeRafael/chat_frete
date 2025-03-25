module.exports = {
    // Chave da API da OpenAI
    openaiApiKey: process.env.OPENAI_API_KEY || "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", // A chave pode ser configurada como variável de ambiente
    
    // Configurações do WhatsApp
    whatsapp: {
      // Número de telefone destino para encaminhar os dados do frete (formato internacional, sem espaços ou traços)
      numeroDestino: '5511999999999'
    },
  
    // Parâmetros de negociação e frete
    negotiation: {
      // Acréscimo de 10% no preço do frete quando o caminhoneiro comenta sobre o valor
      acrescimoPercentual: 10
    }
  };
  