// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

const MAX_EVENTS_TO_STORE = 100; // ATUALIZADO PARA 100
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    console.warn("[docusign-listener] Método não permitido:", event.httpMethod);
    return { statusCode: 405, body: "Método não permitido." };
  }

  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("[docusign-listener] ERRO FATAL: DOCUSIGN_HMAC_SECRET não definido.");
    return { statusCode: 500, body: "Erro de configuração interna." };
  }

  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) {
    console.warn("[docusign-listener] Webhook sem cabeçalho HMAC (x-docusign-signature-1).");
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
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
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
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  console.log("[docusign-listener] Payload Bruto Autenticado (preview):", payloadBodyString.substring(0, 250) + "...");

  const eventId = context.awsRequestId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const receivedTimestamp = new Date().toISOString();

  let newEventEntry = {
    id: eventId,
    receivedAt: receivedTimestamp,
    eventType: "desconhecido",
    relevantInfo: { 
        message: "Informações específicas do evento não extraídas ou payload não é JSON.",
        rawPreview: payloadBodyString.substring(0, 200) + (payloadBodyString.length > 200 ? "..." : "")
    }
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    newEventEntry.eventType = parsedPayload.event || "desconhecido";

    if (parsedPayload.data && parsedPayload.data.envelopeSummary) {
      const summary = parsedPayload.data.envelopeSummary;
      newEventEntry.relevantInfo = {
        envelopeId: parsedPayload.data.envelopeId,
        status: summary.status,
        subject: summary.emailSubject || parsedPayload.emailSubject || "Assunto não disponível",
        timeGeneratedEvent: parsedPayload.generatedDateTime,
        statusChangedDateTime: summary.statusChangedDateTime || "N/A",
        recipientsPreview: []
      };
      if (summary.recipients && summary.recipients.signers && Array.isArray(summary.recipients.signers)) {
        summary.recipients.signers.forEach(signer => {
          if (signer) newEventEntry.relevantInfo.recipientsPreview.push(`Signer: ${signer.name || 'N/A'} (${signer.email || 'N/A'}) - Status: ${signer.status || 'N/A'}`);
        });
      }
      delete newEventEntry.relevantInfo.message;
      delete newEventEntry.relevantInfo.rawPreview;
    } else if (parsedPayload.data && parsedPayload.data.envelopeId) {
        newEventEntry.relevantInfo = {
            envelopeId: parsedPayload.data.envelopeId,
            status: newEventEntry.eventType,
            message: "Estrutura 'envelopeSummary' não encontrada, informações limitadas."
        };
        delete newEventEntry.relevantInfo.rawPreview;
    } else if (parsedPayload) {
        newEventEntry.relevantInfo.message = "Payload JSON não contém a estrutura esperada ('data.envelopeSummary' ou 'data.envelopeId').";
    }
  } catch (error) {
    console.warn("[docusign-listener] Payload não é JSON ou erro no processamento. Erro:", error.message);
    newEventEntry.relevantInfo.message = `Falha ao processar payload: ${error.message}`;
  }

  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;
    if (!siteID || !token) throw new Error("Configuração de Blobs ausente: NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidos.");

    const store = getStore({ name: BLOB_STORE_NAME, siteID: siteID, token: token, consistency: "strong" });
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" }) || [];
    if (!Array.isArray(eventList)) eventList = [];
    
    eventList.unshift(newEventEntry); 
    if (eventList.length > MAX_EVENTS_TO_STORE) eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[docusign-listener] Lista de eventos atualizada. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("[docusign-listener] Erro ao manipular Blobs:", blobError.name, blobError.message, blobError.stack);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno com Blob store.", errorName: blobError.name, errorMessage: blobError.message })};
  }

  return { statusCode: 200, body: "Webhook HMAC verificado e evento processado." };
};