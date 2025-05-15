// netlify/functions/docusign-listener.js
const crypto = require('crypto');
const { getStore } = require("@netlify/blobs");

// ... (MAX_EVENTS_TO_STORE, BLOB_STORE_NAME, BLOB_KEY_EVENT_LIST como antes) ...

exports.handler = async function(event, context) {
  // ... (validação HMAC como antes) ...
  // Se HMAC falhar, retorne 401.

  // Após a validação HMAC bem-sucedida e o processamento do payload:
  // newEventData é preparado como antes

  let newEventData = { /* ... como antes ... */ };
  try {
    const parsedPayload = JSON.parse(payloadBodyString);
    if (parsedPayload && parsedPayload.envelopeStatus) {
      newEventData.relevantInfo = { /* ... extrair dados ... */ };
    }
  } catch (error) { /* ... logar aviso ... */ }

  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;

    if (!siteID || !token) {
      console.error("Variáveis de ambiente NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidas para Netlify Blobs.");
      throw new Error("Configuração de Blobs ausente.");
    }

    // Passando as opções manualmente
    const store = getStore({
      name: BLOB_STORE_NAME,
      siteID: siteID,
      token: token
    });

    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    if (!eventList || !Array.isArray(eventList)) eventList = [];

    eventList.unshift(newEventData);
    if (eventList.length > MAX_EVENTS_TO_STORE) {
      eventList = eventList.slice(0, MAX_EVENTS_TO_STORE);
    }
    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`Lista de eventos atualizada no Netlify Blobs (manual config). Total: ${eventList.length}`);
  } catch (blobError) {
    console.error("Erro ao manipular lista de eventos no Netlify Blobs (manual config):", blobError);
    return { 
        statusCode: 500,
        body: JSON.stringify({ message: "Erro interno ao usar Blob store (manual config).", error: blobError.message })
    };
  }

  return {
    statusCode: 200,
    body: "Webhook HMAC verificado e evento processado.",
  };
};