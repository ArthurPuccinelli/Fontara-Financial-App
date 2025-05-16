// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

const MAX_EVENTS_TO_STORE = 100;
const BLOB_STORE_NAME = "docusignEvents"; // Consistente
const BLOB_KEY_EVENT_LIST = "recent_event_list"; // Consistente

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  // --- VALIDAÇÃO HMAC (COMO ANTES - ESSENCIAL) ---
  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("[docusign-listener] ERRO FATAL: DOCUSIGN_HMAC_SECRET não definido.");
    return { statusCode: 500, body: "Erro de configuração interna do servidor." };
  }
  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) {
    console.warn("[docusign-listener] Webhook sem cabeçalho HMAC.");
    return { statusCode: 401, body: "Autenticação falhou: assinatura ausente." };
  }
  let requestBodyBytes;
  try {
    requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8');
  } catch (e) {
    console.error("[docusign-listener] Erro ao criar buffer do corpo:", e);
    return { statusCode: 400, body: "Corpo da requisição inválido."};
  }
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');
  let receivedSignatureBase64 = receivedSignatureHeader.trim();
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/; // Validação básica
  if (!receivedSignatureBase64 || !base64Regex.test(receivedSignatureBase64)) {
    console.warn("[docusign-listener] Assinatura HMAC recebida em formato inválido:", receivedSignatureHeader);
    return { statusCode: 401, body: "Autenticação falhou: formato de assinatura inválido." };
  }
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);
  if (computedSigBuffer.length !== receivedSigBuffer.length || 
      !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("[docusign-listener] Falha na verificação HMAC.");
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }
  console.log("[docusign-listener] Webhook do Docusign autenticado com HMAC!");
  // --- FIM DA VALIDAÇÃO HMAC ---
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  // Logar apenas uma parte para não poluir demais, mas o parseado será mais útil
  // console.log("[docusign-listener] Payload Bruto Autenticado (preview):", payloadBodyString.substring(0, 300) + "...");

  const eventId = context.awsRequestId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const receivedTimestamp = new Date().toISOString();
  
  let newEventEntry = {
    id: eventId,
    receivedAt: receivedTimestamp,
    eventType: "desconhecido",
    docusignPayload: null, // Para armazenar o objeto 'data' do Docusign ou o payload inteiro
    processingError: null
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    newEventEntry.eventType = parsedPayload.event || "desconhecido";
    
    // Armazena o objeto 'data' completo, que contém envelopeId, envelopeSummary, etc.
    // Ou, se preferir o payload inteiro, use parsedPayload diretamente.
    // Para "100% dos payloads/informações", armazenar parsedPayload.data é uma boa aproximação dos dados do evento.
    if (parsedPayload.data) {
      newEventEntry.docusignPayload = parsedPayload.data;
    } else {
      // Se não houver 'data', armazena o payload parseado inteiro para análise
      newEventEntry.docusignPayload = parsedPayload; 
      console.warn("[docusign-listener] Objeto 'data' não encontrado no payload JSON. Armazenando payload principal.");
    }
    console.log(`[docusign-listener] Evento '${newEventEntry.eventType}' processado. ID do Envelope (se houver): ${newEventEntry.docusignPayload.envelopeId || 'N/A'}`);

  } catch (error) {
    console.error("[docusign-listener] Erro ao parsear ou processar payload JSON:", error.message);
    newEventEntry.processingError = `Falha ao processar payload: ${error.message}. Preview bruto: ${payloadBodyString.substring(0, 300)}...`;
    // Mesmo com erro de parse, ainda tentaremos salvar o que temos (id, receivedAt, erro)
  }

  // Salvar no Netlify Blobs
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;
    if (!siteID || !token) throw new Error("Configuração de Blobs ausente (siteID ou token).");

    const store = getStore({ name: BLOB_STORE_NAME, siteID: siteID, token: token, consistency: "strong" });
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" }) || [];
    if (!Array.isArray(eventList)) eventList = [];
    
    eventList.unshift(newEventEntry); 
    if (eventList.length > MAX_EVENTS_TO_STORE) eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[docusign-listener] Lista de eventos atualizada no Netlify Blobs. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("[docusign-listener] Erro ao manipular Blobs:", blobError.name, blobError.message, blobError.stack);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno com Blob store.", errorName: blobError.name, errorMessage: blobError.message })};
  }

  return { statusCode: 200, body: "Webhook HMAC verificado e evento processado." };
};
