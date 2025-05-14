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
  const receivedSignatureHeader = event.headers['x-docusign-signature-1']; // Cabeçalhos em minúsculas

  if (!receivedSignatureHeader) {
    console.warn("Webhook recebido sem o cabeçalho de assinatura HMAC (x-docusign-signature-1).");
    return { statusCode: 401, body: "Autenticação falhou: assinatura ausente." };
  }

  // 4. O corpo do payload para cálculo do HMAC deve ser o corpo bruto (raw bytes)
  let requestBodyBytes;
  try {
    requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8');
  } catch (e) {
    console.error("Erro ao criar buffer do corpo da requisição:", e);
    return { statusCode: 400, body: "Corpo da requisição inválido."}
  }
  
  // 5. Calcular a assinatura HMAC esperada
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');

  // 6. Comparar a assinatura computada com a assinatura recebida
  // O log indicou que o cabeçalho contém APENAS a assinatura em Base64.
  let receivedSignatureBase64 = receivedSignatureHeader.trim();

  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/; // Regex para validar string base64
  if (!receivedSignatureBase64 || !base64Regex.test(receivedSignatureBase64)) {
    console.warn("Conteúdo do cabeçalho de assinatura HMAC parece inválido ou está vazio. Conteúdo recebido:", receivedSignatureHeader);
    console.log("Cabeçalho x-docusign-signature-1 original:", event.headers['x-docusign-signature-1']); // Log do valor bruto do header
    return { statusCode: 401, body: "Autenticação falhou: assinatura recebida em formato inesperado ou inválida." };
  }
  
  // Comparação segura para evitar ataques de timing
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);

  if (computedSigBuffer.length !== receivedSigBuffer.length || 
      !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("Falha na verificação HMAC. Assinaturas não correspondem.");
    console.log("  -> Assinatura Recebida no Cabeçalho (Base64):", receivedSignatureBase64);
    console.log("  -> Assinatura Computada pela Função (Base64):", computedSignatureBase64);
    // Para depuração mais profunda, se as assinaturas ainda não baterem:
    // console.log("  -> Corpo usado para cálculo HMAC (string UTF-8):", requestBodyBytes.toString('utf-8'));
    // console.log("  -> Segredo HMAC usado (primeiros/últimos chars para verificação):", `${docusignHmacSecret.substring(0, 3)}...${docusignHmacSecret.substring(docusignHmacSecret.length - 3)}`);
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }

  // Se chegou até aqui, a assinatura HMAC é válida!
  console.log("==================================================");
  console.log("Webhook do Docusign Recebido e Autenticado com HMAC!");
  console.log("Data/Hora:", new Date().toISOString());
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
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