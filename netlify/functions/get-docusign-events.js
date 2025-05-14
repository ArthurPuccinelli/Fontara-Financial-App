// netlify/functions/get-docusign-events.js
// Não faremos require('@netlify/blobs') aqui no topo

const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  // Importa @netlify/blobs dinamicamente
  const { getStore } = await import('@netlify/blobs');

  if (event.httpMethod !== "GET") {
    // ... (resto do código permanece o mesmo) ...
  }

  try {
    const store = getStore(BLOB_STORE_NAME); // Agora getStore está disponível
    const eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" }); 
    // ... (resto da lógica) ...
    return {
      statusCode: 200,
      body: JSON.stringify(eventList || []), // Retorna lista ou array vazio
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    // ... (tratamento de erro) ...
  }
};