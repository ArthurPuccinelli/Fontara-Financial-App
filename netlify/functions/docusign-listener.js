// netlify/functions/docusign-listener.js

exports.handler = async function(event, context) {
  // Docusign Connect geralmente envia requisições POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405, // Method Not Allowed
      body: "Método não permitido. Por favor, use POST.",
    };
  }

  console.log("==================================================");
  console.log("Webhook do Docusign Recebido!");
  console.log("Data/Hora:", new Date().toISOString());
  console.log("ID da Requisição (AWS):", context.awsRequestId);
  console.log("Método HTTP:", event.httpMethod);
  // console.log("Cabeçalhos da Requisição:", JSON.stringify(event.headers, null, 2)); // Descomente se precisar ver todos os cabeçalhos

  // O corpo do payload pode estar codificado em Base64 pela infraestrutura da Netlify/AWS
  let payloadBody = event.body;
  if (event.isBase64Encoded) {
    try {
      payloadBody = Buffer.from(payloadBody, 'base64').toString('utf-8');
    } catch (e) {
      console.error("Erro ao decodificar corpo Base64:", e);
      payloadBody = event.body; // Mantém o corpo original se a decodificação falhar
    }
  }

  console.log("--- Corpo do Payload (Bruto) ---");
  console.log(payloadBody);
  console.log("---------------------------------");

  // Docusign Connect pode enviar XML (padrão) ou JSON.
  // Vamos tentar fazer o parse como JSON primeiro, que é mais fácil de trabalhar em JS.
  // Se você configurou o Docusign Connect para enviar JSON, ótimo.
  // Se for XML, você precisará de uma biblioteca para parsear XML (ex: xml2js) se quiser estrutura-lo.
  let parsedPayload;
  try {
    parsedPayload = JSON.parse(payloadBody);
    console.log("--- Corpo do Payload (JSON Parseado) ---");
    console.log(JSON.stringify(parsedPayload, null, 2));
    console.log("--------------------------------------");

    // EXEMPLO: Como extrair informações relevantes se o payload for JSON
    // (A estrutura exata dependerá do que o Docusign Connect envia para os eventos que você configurou)
    if (parsedPayload && parsedPayload.envelopeStatus) {
      console.log("== Informações Relevantes do Envelope (Exemplo) ==");
      console.log("  ID do Envelope:", parsedPayload.envelopeStatus.envelopeID);
      console.log("  Status do Envelope:", parsedPayload.envelopeStatus.status);
      console.log("  Assunto:", parsedPayload.envelopeStatus.subject);

      if (parsedPayload.envelopeStatus.recipients && parsedPayload.envelopeStatus.recipients.recipient) {
        // Docusign pode enviar um único recipient como objeto ou múltiplos como array
        const recipients = Array.isArray(parsedPayload.envelopeStatus.recipients.recipient) 
                           ? parsedPayload.envelopeStatus.recipients.recipient 
                           : [parsedPayload.envelopeStatus.recipients.recipient];

        recipients.forEach(recipient => {
          if(recipient) { // Verifica se o recipient não é nulo/undefined
            console.log(`  -> Destinatário: ${recipient.userName} (Email: ${recipient.email || 'N/A'}, Rota: ${recipient.routingOrder || 'N/A'}, Status: ${recipient.status || 'N/A'})`);
          }
        });
      }
      console.log("================================================");
    }

  } catch (error) {
    console.warn("Não foi possível fazer o parse do payload como JSON. Pode ser XML ou outro formato.");
    // Se for XML, o payloadBody bruto já foi logado.
    // Para processar XML, você instalaria um parser: npm install xml2js
    // e usaria algo como:
    // const xml2js = require('xml2js');
    // xml2js.parseString(payloadBody, (err, result) => { ... });
  }

  // IMPORTANTE: Docusign Connect espera uma resposta 200 OK para confirmar o recebimento.
  // Se não receber, ele tentará reenviar a notificação.
  return {
    statusCode: 200,
    body: "Webhook recebido com sucesso pela Fontara Financial.", // Mensagem para o Docusign
  };
};