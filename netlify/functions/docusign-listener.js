// netlify/functions/docusign-listener.js
const crypto = require('crypto');

exports.handler = async function(event, context) {
  // 1. Verificar se é um POST
  if (event.httpMethod !== "POST") {
    console.warn("Método não permitido recebido:", event.httpMethod);
    return { statusCode: 405, body: "Método não permitido." };
  }

  // 2. Obter o segredo HMAC das variáveis de ambiente
  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("ERRO DE CONFIGURAÇÃO: Segredo HMAC (DOCUSIGN_HMAC_SECRET) não está definido nas variáveis de ambiente do Netlify.");
    return { statusCode: 500, body: "Erro de configuração interna do servidor." };
  }

  // 3. Obter a(s) assinatura(s) do cabeçalho da requisição
  // Docusign envia como 'x-docusign-signature-1', 'x-docusign-signature-2', etc.
  // Os cabeçalhos chegam em minúsculas no objeto 'event.headers'.
  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];

  if (!receivedSignatureHeader) {
    console.warn("Webhook recebido sem o cabeçalho de assinatura HMAC (x-docusign-signature-1).");
    return { statusCode: 401, body: "Autenticação falhou: assinatura ausente." };
  }

  // 4. O corpo do payload para cálculo do HMAC deve ser o corpo bruto (raw bytes)
  // A Netlify Functions/AWS API Gateway passa o corpo como string. Se `isBase64Encoded` for true,
  // o `event.body` é uma string Base64 do corpo binário original.
  // Se `isBase64Encoded` for false, `event.body` é a string do corpo (ex: um payload JSON ou XML como string).
  // Docusign calcula o HMAC sobre os bytes brutos do payload.
  let requestBodyBytes;
  try {
    requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8');
  } catch (e) {
    console.error("Erro ao criar buffer do corpo da requisição:", e);
    return { statusCode: 400, body: "Corpo da requisição inválido."}
  }
  

  // 5. Calcular a assinatura HMAC esperada
  // Docusign usa SHA256 para HMAC por padrão.
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');

  // 6. Comparar a assinatura computada com a assinatura recebida
  // O formato do cabeçalho é 'algoritmo=assinatura_base64', ex: 'sha256=VALUESHERE=='
  // Precisamos extrair apenas a parte da assinatura em base64.
  const signatureParts = receivedSignatureHeader.split('=');
  let receivedSignatureBase64 = '';
  if (signatureParts.length === 2 && signatureParts[0].toLowerCase() === 'sha256') {
    receivedSignatureBase64 = signatureParts[1];
  } else {
    console.warn("Formato inesperado para o cabeçalho de assinatura HMAC:", receivedSignatureHeader);
    return { statusCode: 401, body: "Autenticação falhou: formato de assinatura inválido." };
  }
  
  // Comparação segura para evitar ataques de timing
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);

  if (computedSigBuffer.length !== receivedSigBuffer.length || 
      !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("Falha na verificação HMAC. Assinaturas não correspondem.");
    console.log("  -> Assinatura Recebida (Base64):", receivedSignatureBase64);
    console.log("  -> Assinatura Computada (Base64):", computedSignatureBase64);
    // Para depuração, você pode logar o corpo que foi usado para o cálculo:
    // console.log("  -> Corpo usado para cálculo HMAC (string):", requestBodyBytes.toString('utf-8'));
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }

  // Se chegou até aqui, a assinatura HMAC é válida!
  console.log("==================================================");
  console.log("Webhook do Docusign Recebido e Autenticado com HMAC!");
  console.log("Data/Hora:", new Date().toISOString());
  
  const payloadBodyString = requestBodyBytes.toString('utf-8'); // Agora podemos usar a string
  console.log("--- Corpo do Payload (Bruto Autenticado) ---");
  console.log(payloadBodyString);
  console.log("--------------------------------------------");

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    console.log("--- Corpo do Payload (JSON Parseado) ---");
    console.log(JSON.stringify(parsedPayload, null, 2));
    console.log("--------------------------------------");

    if (parsedPayload && parsedPayload.envelopeStatus) {
      console.log("== Informações Relevantes do Envelope (Exemplo) ==");
      console.log("  ID do Envelope:", parsedPayload.envelopeStatus.envelopeID);
      console.log("  Status do Envelope:", parsedPayload.envelopeStatus.status);
      console.log("  Assunto:", parsedPayload.envelopeStatus.subject);
      
      if (parsedPayload.envelopeStatus.recipients && parsedPayload.envelopeStatus.recipients.recipient) {
        const recipients = Array.isArray(parsedPayload.envelopeStatus.recipients.recipient) 
                           ? parsedPayload.envelopeStatus.recipients.recipient 
                           : [parsedPayload.envelopeStatus.recipients.recipient];
        recipients.forEach(recipient => {
          if(recipient) {
            console.log(`  -> Destinatário: ${recipient.userName} (Email: ${recipient.email || 'N/A'}, Rota: ${recipient.routingOrder || 'N/A'}, Status: ${recipient.status || 'N/A'})`);
          }
        });
      }
      console.log("================================================");
    }

  } catch (error) {
    console.warn("Não foi possível fazer o parse do payload como JSON. Pode ser XML.");
  }

  return {
    statusCode: 200,
    body: "Webhook HMAC verificado e recebido com sucesso.",
  };
};