// netlify/functions/docusign-listener.mjs
import crypto from 'crypto';
import { getStore } from "@netlify/blobs"; // Usando import

const MAX_EVENTS_TO_STORE = 20;
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

export const handler = async function(event, context) { // Usando export const handler
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("ERRO DE CONFIGURAÇÃO: Segredo HMAC (DOCUSIGN_HMAC_SECRET) não definido.");
    return { statusCode: 500, body: "Erro de configuração interna." };
  }

  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) {
    console.warn("Webhook recebido sem o cabeçalho de assinatura HMAC (x-docusign-signature-1).");
    return { statusCode: 401, body: "Autenticação falhou: assinatura ausente." };
  }

  let requestBodyBytes;
  try {
    requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8');
  } catch (e) {
    console.error("Erro ao criar buffer do corpo:", e);
    return { statusCode: 400, body: "Corpo da requisição inválido."};
  }
  
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');
  
  let receivedSignatureBase64 = receivedSignatureHeader.trim();
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!receivedSignatureBase64 || !base64Regex.test(receivedSignatureBase64)) {
    console.warn("Assinatura HMAC recebida em formato inválido:", receivedSignatureHeader);
    return { statusCode: 401, body: "Autenticação falhou: formato de assinatura inválido." };
  }
  
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);

  if (computedSigBuffer.length !== receivedSigBuffer.length || 
      !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    console.warn("Falha na verificação HMAC. Assinaturas não correspondem.");
    console.log("  -> Assinatura Recebida no Cabeçalho (Base64):", receivedSignatureBase64);
    console.log("  -> Assinatura Computada pela Função (Base64):", computedSignatureBase64);
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }

  console.log("Webhook do Docusign autenticado com HMAC!");
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  console.log("Payload Bruto Autenticado:", payloadBodyString);

  let newEventData = {
    id: context.awsRequestId,
    receivedAt: new Date().toISOString(),
    parsedPayload: null,
    relevantInfo: { message: "Nenhuma informação relevante extraída ou payload não é JSON." }
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    newEventData.parsedPayload = parsedPayload;
    console.log("Payload JSON Parseado:", JSON.stringify(parsedPayload, null, 2));

    if (parsedPayload && parsedPayload.envelopeStatus) {
      newEventData.relevantInfo = {
        envelopeId: parsedPayload.envelopeStatus.envelopeID,
        status: parsedPayload.envelopeStatus.status,
        subject: parsedPayload.envelopeStatus.subject,
        timeGenerated: parsedPayload.envelopeStatus.timeGenerated,
      };
    }
  } catch (error) {
    console.warn("Payload não é JSON. Armazenando com mensagem de erro. Erro:", error.message);
    newEventData.relevantInfo.rawPreview = payloadBodyString.substring(0, 200) + (payloadBodyString.length > 200 ? "..." : "");
  }

  try {
    const store = getStore(BLOB_STORE_NAME);
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });

    if (!eventList || !Array.isArray(eventList)) {
      eventList = [];
    }
    eventList.unshift(newEventData.relevantInfo);
    if (eventList.length > MAX_EVENTS_TO_STORE) {
      eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    }
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`Lista de eventos atualizada no Netlify Blobs. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("Erro ao manipular lista de eventos no Netlify Blobs:", blobError);
  }

  return {
    statusCode: 200,
    body: "Webhook HMAC verificado e evento processado.",
  };
};