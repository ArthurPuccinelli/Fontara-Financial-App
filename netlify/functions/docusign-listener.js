// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

// Constantes definidas no escopo do módulo (global para este arquivo)
const MAX_EVENTS_TO_STORE = 20;
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  // 1. Verificar se é um POST
  if (event.httpMethod !== "POST") {
    console.warn("[docusign-listener] Método não permitido recebido:", event.httpMethod);
    return { statusCode: 405, body: "Método não permitido." };
  }

  // 2. Obter e verificar o segredo HMAC
  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("[docusign-listener] ERRO DE CONFIGURAÇÃO: Segredo HMAC (DOCUSIGN_HMAC_SECRET) não definido.");
    return { statusCode: 500, body: "Erro de configuração interna do servidor." };
  }

  // 3. Obter a assinatura do cabeçalho
  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) {
    console.warn("[docusign-listener] Webhook recebido sem o cabeçalho de assinatura HMAC (x-docusign-signature-1).");
    return { statusCode: 401, body: "Autenticação falhou: assinatura ausente." };
  }

  // 4. Preparar o corpo da requisição para verificação HMAC
  let requestBodyBytes;
  try {
    requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8');
  } catch (e) {
    console.error("[docusign-listener] Erro ao criar buffer do corpo da requisição:", e);
    return { statusCode: 400, body: "Corpo da requisição inválido."};
  }
  
  // 5. Calcular a assinatura HMAC esperada
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');

  // 6. Comparar assinaturas
  let receivedSignatureBase64 = receivedSignatureHeader.trim();
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!receivedSignatureBase64 || !base64Regex.test(receivedSignatureBase64)) {
    console.warn("[docusign-listener] Conteúdo do cabeçalho de assinatura HMAC parece inválido ou está vazio. Conteúdo recebido:", receivedSignatureHeader);
    return { statusCode: 401, body: "Autenticação falhou: assinatura recebida em formato inesperado ou inválida." };
  }
  
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);

  if (computedSigBuffer.length !== receivedSigBuffer.length || 
      !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("[docusign-listener] Falha na verificação HMAC. Assinaturas não correspondem.");
    console.log("  -> Assinatura Recebida no Cabeçalho (Base64):", receivedSignatureBase64);
    console.log("  -> Assinatura Computada pela Função (Base64):", computedSignatureBase64);
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }

  console.log("[docusign-listener] Webhook do Docusign autenticado com HMAC!");
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  console.log("[docusign-listener] Payload Bruto Autenticado:", payloadBodyString.substring(0, 500) + (payloadBodyString.length > 500 ? "..." : "")); // Log truncado

  let newEventData = {
    id: context.awsRequestId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    receivedAt: new Date().toISOString(),
    relevantInfo: { message: "Nenhuma informação relevante extraída ou payload não é JSON." },
    // rawPayloadPreview: payloadBodyString.substring(0, 500) + (payloadBodyString.length > 500 ? "..." : "") // Preview se precisar
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    // newEventData.parsedPayload = parsedPayload; // Descomente se quiser guardar o payload parseado completo para cada evento
    console.log("[docusign-listener] Payload JSON Parseado (início):", JSON.stringify(parsedPayload, null, 2).substring(0, 500) + "...");

    if (parsedPayload && parsedPayload.envelopeStatus) {
      newEventData.relevantInfo = {
        envelopeId: parsedPayload.envelopeStatus.envelopeID,
        status: parsedPayload.envelopeStatus.status,
        subject: parsedPayload.envelopeStatus.subject,
        timeGenerated: parsedPayload.envelopeStatus.timeGenerated,
        // Adicione outros campos relevantes e concisos aqui
      };
    } else {
        newEventData.relevantInfo.message = "Estrutura envelopeStatus não encontrada no payload JSON.";
    }
  } catch (error) {
    console.warn("[docusign-listener] Payload não é JSON. Armazenando com mensagem de erro. Erro:", error.message);
    newEventData.relevantInfo.rawPreview = payloadBodyString.substring(0, 200) + (payloadBodyString.length > 200 ? "..." : "");
  }

  // Salvar no Netlify Blobs
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;

    console.log("[docusign-listener] [Blobs Debug] Tentando usar Netlify Blobs.");
    console.log("[docusign-listener] [Blobs Debug] process.env.NETLIFY_SITE_ID:", siteID ? `"${siteID}"` : "NÃO DEFINIDO");
    console.log("[docusign-listener] [Blobs Debug] process.env.NETLIFY_API_ACCESS_TOKEN presente?", !!token);

    if (!siteID || !token) {
      console.error("[docusign-listener] ERRO CRÍTICO: Variáveis NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidas para Blobs.");
      throw new Error("Configuração de Blobs ausente: siteID ou token não definidos nas variáveis de ambiente.");
    }

    const store = getStore({
      name: BLOB_STORE_NAME,
      siteID: siteID,
      token: token,
      consistency: "strong"
    });
    
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    console.log("[docusign-listener] [Blobs Debug] Lista de eventos lida do store (antes de adicionar):", eventList ? `${eventList.length} eventos` : "lista não existe/vazia");

    if (!eventList || !Array.isArray(eventList)) {
      eventList = [];
    }

    eventList.unshift(newEventData); // Adiciona o novo evento (com id, receivedAt, relevantInfo)
    
    if (eventList.length > MAX_EVENTS_TO_STORE) {
      eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    }

    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[docusign-listener] Lista de eventos atualizada no Netlify Blobs. Total: ${eventList.length}`);

  } catch (blobError) {
    console.error("[docusign-listener] Erro ao manipular lista de eventos no Netlify Blobs:", blobError.name, blobError.message);
    if(blobError.stack) console.error("[docusign-listener] Stack do erro de Blob:", blobError.stack);
    // Retorna 500 para o Docusign se houver erro com o Blob, para que você saiba que o armazenamento falhou.
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            message: "Erro interno ao tentar salvar dados do evento no Blob store.", 
            errorName: blobError.name,
            errorMessage: blobError.message 
        })
    };
  }

  return {
    statusCode: 200,
    body: "Webhook HMAC verificado e evento processado.",
  };
};