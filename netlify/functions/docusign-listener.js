// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

const MAX_EVENTS_TO_STORE = 20;
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
    console.warn("[docusign-listener] Falha na verificação HMAC. Assinaturas não correspondem.");
    // Não logue as assinaturas em produção se não for estritamente necessário para depuração.
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }

  console.log("[docusign-listener] Webhook do Docusign autenticado com HMAC!");
  
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  // Log truncado para payloads grandes
  console.log("[docusign-listener] Payload Bruto Autenticado (preview):", payloadBodyString.substring(0, 500) + (payloadBodyString.length > 500 ? "..." : ""));

  // Cria um ID de evento único e registra quando foi recebido
  const eventId = context.awsRequestId || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const receivedTimestamp = new Date().toISOString();

  let newEventEntry = {
    id: eventId,
    receivedAt: receivedTimestamp,
    eventType: "desconhecido",
    relevantInfo: { 
        message: "Informações específicas do evento não extraídas ou payload não é JSON.",
        rawPreview: payloadBodyString.substring(0, 250) + (payloadBodyString.length > 250 ? "..." : "") // Preview do payload bruto
    }
  };

  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    console.log("[docusign-listener] Payload JSON Parseado com sucesso.");
    // console.log(JSON.stringify(parsedPayload, null, 2)); // Descomente para logar o payload completo se necessário para depuração

    newEventEntry.eventType = parsedPayload.event || "desconhecido";

    // Lógica de extração ajustada para a estrutura observada: payload.data.envelopeSummary
    if (parsedPayload.data && parsedPayload.data.envelopeSummary) {
      const summary = parsedPayload.data.envelopeSummary;
      newEventEntry.relevantInfo = {
        envelopeId: parsedPayload.data.envelopeId, // ID do envelope está em payload.data.envelopeId
        status: summary.status,                     // Status está em payload.data.envelopeSummary.status
        subject: summary.emailSubject || parsedPayload.emailSubject || "Assunto não disponível", // Tenta pegar o assunto de alguns lugares
        timeGeneratedEvent: parsedPayload.generatedDateTime, // Quando o evento do webhook foi gerado
        statusChangedDateTime: summary.statusChangedDateTime || "N/A", // Quando o status do envelope mudou
        recipientsPreview: []
      };

      if (summary.recipients && summary.recipients.signers && Array.isArray(summary.recipients.signers)) {
        summary.recipients.signers.forEach(signer => {
          if (signer) {
            newEventEntry.relevantInfo.recipientsPreview.push(
              `Signer: ${signer.name || 'N/A'} (${signer.email || 'N/A'}) - Status: ${signer.status || 'N/A'}`
            );
          }
        });
      }
      // Limpa a mensagem de fallback se conseguimos extrair infos
      delete newEventEntry.relevantInfo.message;
      delete newEventEntry.relevantInfo.rawPreview;

    } else if (parsedPayload.data && parsedPayload.data.envelopeId) {
        // Fallback se envelopeSummary não existir, mas envelopeId sim
        newEventEntry.relevantInfo = {
            envelopeId: parsedPayload.data.envelopeId,
            status: newEventEntry.eventType, // Usa o nome do evento como status
            message: "Estrutura 'envelopeSummary' não encontrada, informações limitadas."
        };
        delete newEventEntry.relevantInfo.rawPreview;
    } else if (parsedPayload) {
        newEventEntry.relevantInfo.message = "Payload JSON não contém a estrutura esperada ('data.envelopeSummary' ou 'data.envelopeId').";
    }
    // Se o parse do JSON falhar, a mensagem inicial em relevantInfo é mantida.

  } catch (error) {
    console.warn("[docusign-listener] Payload não é JSON ou erro ao processar o payload JSON. Erro:", error.message);
    // newEventEntry.relevantInfo já tem uma mensagem de erro e rawPreview definidos no início.
    newEventEntry.relevantInfo.message = `Falha ao processar payload: ${error.message}`;
  }

  // Salvar no Netlify Blobs
  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;

    if (!siteID || !token) {
      console.error("[docusign-listener] ERRO CRÍTICO: Variáveis NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidas para Blobs.");
      throw new Error("Configuração de Blobs ausente: siteID ou token não definidos.");
    }

    const store = getStore({ name: BLOB_STORE_NAME, siteID: siteID, token: token, consistency: "strong" });
    
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    if (!eventList || !Array.isArray(eventList)) eventList = [];
    
    eventList.unshift(newEventEntry); 
    if (eventList.length > MAX_EVENTS_TO_STORE) eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[docusign-listener] Lista de eventos atualizada no Netlify Blobs. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("[docusign-listener] Erro ao manipular lista de eventos no Netlify Blobs:", blobError.name, blobError.message);
    // Retorna 500 para Docusign se houver erro com o Blob.
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