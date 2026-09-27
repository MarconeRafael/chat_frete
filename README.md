# Chat Frete

Chatbot para atendimento e processamento de pedidos de frete pelo WhatsApp, com suporte a mensagens de texto e áudio e integração com a API da OpenAI.

## Overview

O **Chat Frete** integra WhatsApp, processamento de linguagem e automação para receber mensagens de motoristas e encaminhá-las para uma lógica de processamento de fretes.

O sistema foi desenvolvido em **Node.js** e utiliza a API da **OpenAI** para transformar mensagens de áudio em texto antes de encaminhá-las ao fluxo principal da aplicação.

## Architecture

```text
WhatsApp
   ↓
whatsapp-web.js
   ↓
Message Processing
   ├── Text
   │
   └── Audio
        ↓
     Download
        ↓
     OGG → WAV
        ↓
     OpenAI Whisper
        ↓
     Transcribed Text
        ↓
   Freight Processing
```

## Main Features

* Recebimento de mensagens pelo WhatsApp
* Processamento de mensagens de texto
* Suporte a mensagens de voz e áudio
* Download automático de arquivos de áudio
* Conversão de OGG para WAV utilizando FFmpeg
* Transcrição de áudio utilizando OpenAI Whisper
* Encaminhamento das mensagens para a lógica de processamento de fretes
* Tratamento de erros durante o processamento
* Remoção automática dos arquivos temporários após a transcrição

## Technologies

* **Node.js**
* **JavaScript**
* **whatsapp-web.js**
* **OpenAI API**
* **Whisper**
* **FFmpeg**
* **File System API**
* **Asynchronous Processing**

## Processing Flow

Quando uma mensagem é recebida, o sistema identifica seu tipo.

Mensagens de texto são encaminhadas diretamente para a lógica de processamento de fretes.

Mensagens de áudio seguem um fluxo adicional:

1. Download do arquivo enviado pelo WhatsApp.
2. Salvamento temporário do áudio em formato OGG.
3. Conversão para WAV utilizando FFmpeg.
4. Envio do arquivo para a API de transcrição da OpenAI.
5. Substituição do conteúdo da mensagem pelo texto transcrito.
6. Encaminhamento da mensagem para o módulo responsável pelo processamento de fretes.
7. Remoção do arquivo temporário.

## Project Structure

```text
chat_frete/
├── main.js
├── whatsappClient.js
├── freteLogic.js
├── utils.js
├── package.json
├── .env.example
├── .gitignore
└── README.md
```

## Configuration

A chave da API da OpenAI deve ser configurada através de variável de ambiente:

```env
OPENAI_API_KEY=your_openai_api_key
```

Não armazene credenciais diretamente no código ou no repositório.

## Running Locally

Instale as dependências:

```bash
npm install
```

Certifique-se de que o **FFmpeg** está instalado e disponível no `PATH`.

Configure a variável de ambiente:

```bash
export OPENAI_API_KEY=your_openai_api_key
```

Execute a aplicação:

```bash
node main.js
```

O cliente do WhatsApp será inicializado e o sistema ficará aguardando novas mensagens.

## Engineering Highlights

O projeto demonstra a integração entre:

* comunicação via WhatsApp;
* processamento assíncrono de mensagens;
* processamento de arquivos de áudio;
* conversão de formatos de mídia;
* transcrição automática com IA;
* integração de serviços externos;
* separação da lógica de processamento em módulos;
* tratamento de falhas e limpeza de arquivos temporários.

## License

Apache 2.0
