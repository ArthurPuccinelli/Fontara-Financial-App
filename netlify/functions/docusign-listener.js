// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs"); // Usando require

const MAX_EVENTS_TO_STORE = 20;
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  if (!docusignHmacSecret) {
    console.error("ERRO DE CONFIGURAÇÃO: Segredo HMAC (DOCUSIGN_HMAC_SECRET) não definido.");
    return { statusCode: 500, body: "Erro de configuração interna." };
  }

  // ... (resto da lógica de verificação HMAC como na versão .mjs,
  //      ela não muda entre CJS e ESM em termos de chamadas crypto) ...
  const receivedSignatureHeader = event.headers['x-docusign-signature-1'];
  if (!receivedSignatureHeader) { /* ... erro 401 ... */ }
  let requestBodyBytes;
  try { requestBodyBytes = Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf-8'); } 
  catch (e) { /* ... erro 400 ... */ }
  const hmac = crypto.createHmac('sha256', docusignHmacSecret);
  hmac.update(requestBodyBytes);
  const computedSignatureBase64 = hmac.digest('base64');
  let receivedSignatureBase64 = receivedSignatureHeader.trim();
  const base64Regex = /^[A-Za-z0-9+/]+={0,2}$/;
  if (!receivedSignatureBase64 || !base64Regex.test(receivedSignatureBase64)) { /* ... erro 401 ... */ }
  const computedSigBuffer = Buffer.from(computedSignatureBase64);
  const receivedSigBuffer = Buffer.from(receivedSignatureBase64);
  if (computedSigBuffer.length !== receivedSigBuffer.length || !crypto.timingSafeEqual(computedSigBuffer, receivedSigBuffer)) {
    /* ... erro 401 com logs detalhados ... */
    console.warn("Falha na verificação HMAC. Assinaturas não correspondem.");
    console.log("  -> Assinatura Recebida no Cabeçalho (Base64):", receivedSignatureBase64);
    console.log("  -> Assinatura Computada pela Função (Base64):", computedSignatureBase64);
    return { statusCode: 401, body: "Autenticação falhou: assinatura inválida." };
  }
  // Fim da verificação HMAC (resumida)


  console.log("Webhook do Docusign autenticado com HMAC!");
  const payloadBodyString = requestBodyBytes.toString('utf-8');
  // ... (lógica de parse do payload e extração de newEventData.relevantInfo como antes) ...
  let newEventData = {
    id: context.awsRequestId || `evt_${Date.now()}`,
    receivedAt: new Date().toISOString(),
    relevantInfo: { message: "Nenhuma informação relevante extraída ou payload não é JSON." }
  };
  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    if (parsedPayload && parsedPayload.envelopeStatus) {
      newEventData.relevantInfo = { /* ... extrair dados ... */ };
    }
  } catch (error) { /* ... logar aviso ... */ }


  try {
    const store = getStore(BLOB_STORE_NAME); // Esta chamada pode ser o ponto do erro ERR_REQUIRE_ESM
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    if (!eventList || !Array.isArray(eventList)) eventList = [];
    
    eventList.unshift(newEventData); // Adiciona o objeto newEventData completo
    if (eventList.length > MAX_EVENTS_TO_STORE) {
      eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    }
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`Lista de eventos atualizada no Netlify Blobs. Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("Erro ao manipular lista de eventos no Netlify Blobs:", blobError);
    // Se o erro for ERR_REQUIRE_ESM, ele pode ocorrer aqui na chamada a getStore.
    // Retornar 200 para Docusign, mas logar o erro é uma estratégia.
    // Para depuração, podemos retornar 500 para ver o erro mais claramente se o problema for com Blobs.
     return { 
        statusCode: 500, // Mudado para 500 para facilitar o debug se Blobs falhar
        body: JSON.stringify({ message: "Erro interno ao usar Blob store.", error: blobError.message, stack: blobError.stack })
    };
  }

  return {
    statusCode: 200,
    body: "Webhook HMAC verificado e evento processado.",
  };
};