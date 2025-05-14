// netlify/functions/docusign-listener.js
const crypto = require('crypto');
// Não faremos require('@netlify/blobs') aqui no topo

const MAX_EVENTS_TO_STORE = 20;
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  // Importa @netlify/blobs dinamicamente
  const { getStore } = await import('@netlify/blobs');

  if (event.httpMethod !== "POST") {
    // ... (resto do código permanece o mesmo)
  }

  const docusignHmacSecret = process.env.DOCUSIGN_HMAC_SECRET;
  // ... (resto do código da função como estava na versão CommonJS,
  //      apenas a importação do getStore mudou para dinâmica e no topo do handler) ...

  // Exemplo de uso do getStore após o import dinâmico
  try {
    const store = getStore(BLOB_STORE_NAME); // Agora getStore está disponível
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    // ... (lógica da lista) ...
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