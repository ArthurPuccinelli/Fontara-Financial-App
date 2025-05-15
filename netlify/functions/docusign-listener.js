// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

const MAX_EVENTS_TO_STORE = 100;
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  // VALIDAÇÃO HMAC (essencial - mantenha seu código de validação HMAC aqui)
  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) { /* ... erro 500 ... */ return {statusCode: 500, body: "HMAC Secret não configurado."}}
  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) { /* ... erro 401 ... */ return {statusCode: 401, body: "Assinatura HMAC ausente."}}
  let requestBodyBytes;
  try { requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8'); } 
  catch (e) { /* ... erro 400 ... */ return {statusCode: 400, body: "Corpo da requisição inválido."} }
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');
  let receivedSignatureBase64 = receivedSignatureHeader.trim();
  // (Validação do formato base64 da assinatura recebida omitida por brevidade, mas importante)
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);
  if (computedSigBuffer.length !== receivedSigBuffer.length || !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("[docusign-listener] Falha na verificação HMAC.");
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }
  console.log("[docusign-listener] Webhook do Docusign autenticado com HMAC!");
  // FIM DA VALIDAÇÃO HMAC (resumida)

  const payloadBodyString = requestBodyBytes.toString('utf-8');
  console.log("[docusign-listener] Payload Bruto Autenticado (preview):", payloadBodyString.substring(0, 300) + "...");

  const eventId = context.awsRequestId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const receivedTimestamp = new Date().toISOString();
  
  let newEventEntry = {
    id: eventId,
    receivedAt: receivedTimestamp,
    eventType: "desconhecido",
    // Estrutura padrão para relevantInfo
    relevantInfo: { 
        message: "Payload não processado ou informações não extraídas.",
        rawPreview: payloadBodyString.substring(0, 250) + (payloadBodyString.length > 250 ? "..." : "")
    }
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    newEventEntry.eventType = parsedPayload.event || "desconhecido";
    
    // Limpa a mensagem padrão se o parse foi bem-sucedido
    delete newEventEntry.relevantInfo.message;
    delete newEventEntry.relevantInfo.rawPreview;

    newEventEntry.relevantInfo.apiVersion = parsedPayload.apiVersion;
    newEventEntry.relevantInfo.generatedDateTime = parsedPayload.generatedDateTime; // Data do evento Docusign

    if (parsedPayload.data) {
      const data = parsedPayload.data;
      newEventEntry.relevantInfo.accountId = data.accountId;
      newEventEntry.relevantInfo.envelopeId = data.envelopeId; // Comum a muitos eventos

      if (data.envelopeSummary) { // Para eventos de envelope
        const summary = data.envelopeSummary;
        newEventEntry.relevantInfo.status = summary.status;
        newEventEntry.relevantInfo.emailSubject = summary.emailSubject;
        newEventEntry.relevantInfo.emailBlurb = summary.emailBlurb;
        newEventEntry.relevantInfo.createdDateTime = summary.createdDateTime;
        newEventEntry.relevantInfo.lastModifiedDateTime = summary.lastModifiedDateTime;
        newEventEntry.relevantInfo.statusChangedDateTime = summary.statusChangedDateTime;
        if (summary.sender) {
          newEventEntry.relevantInfo.senderName = summary.sender.userName;
          newEventEntry.relevantInfo.senderEmail = summary.sender.email;
        }
        if (summary.recipients) {
          newEventEntry.relevantInfo.recipients = { // Armazena o bloco de recipients
            signers: summary.recipients.signers || [],
            carbonCopies: summary.recipients.carbonCopies || [],
            // Adicione outros tipos de destinatários se necessário
          };
        }
        if (summary.envelopeDocuments && Array.isArray(summary.envelopeDocuments)) {
          newEventEntry.relevantInfo.documentNames = summary.envelopeDocuments.map(doc => doc.name).join(', ');
        }
      } else if (data.recipientId) { // Para eventos de destinatário
        newEventEntry.relevantInfo.recipientId = data.recipientId;
        // O status do destinatário geralmente está no evento principal ou em campos específicos
        // Ex: parsedPayload.event pode ser "recipient-completed", "recipient-delivered"
        // Ou pode haver um objeto recipientSummary ou campos de status do destinatário em 'data'
        // Se seu payload de evento de destinatário tiver mais detalhes em 'data', adicione-os aqui.
        // Ex: newEventEntry.relevantInfo.recipientStatus = data.status; (se existir)
        // newEventEntry.relevantInfo.recipientName = data.userName; (se existir)
        // newEventEntry.relevantInfo.recipientEmail = data.email; (se existir)
        newEventEntry.relevantInfo.status = newEventEntry.eventType; // Usa o tipo de evento como status principal
      } else {
        newEventEntry.relevantInfo.message = "Estrutura 'data.envelopeSummary' ou 'data.recipientId' não encontrada.";
      }
    } else {
      newEventEntry.relevantInfo.message = "Objeto 'data' não encontrado no payload.";
    }

  } catch (error) {
    console.warn("[docusign-listener] Payload não é JSON ou erro no processamento. Erro:", error.message);
    newEventEntry.relevantInfo.message = `Falha ao processar payload: ${error.message}`;
    // relevantInfo.rawPreview já foi definido
  }

  // Salvar no Netlify Blobs
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;
    if (!siteID || !token) throw new Error("Configuração de Blobs ausente.");

    const store = getStore({ name: BLOB_STORE_NAME, siteID: siteID, token: token, consistency: "strong" });
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" }) || [];
    if (!Array.isArray(eventList)) eventList = [];
    
    eventList.unshift(newEventEntry); 
    if (eventList.length > MAX_EVENTS_TO_STORE) eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[docusign-listener] Lista de eventos atualizada. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("[docusign-listener] Erro ao manipular Blobs:", blobError.name, blobError.message);
    return { statusCode: 500, body: JSON.stringify({ message: "Erro interno com Blob store.", errorName: blobError.name, errorMessage: blobError.message })};
  }

  return { statusCode: 200, body: "Webhook HMAC verificado e evento processado." };
};
