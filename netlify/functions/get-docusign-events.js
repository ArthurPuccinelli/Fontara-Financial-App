// netlify/functions/get-docusign-events.js
const { getStore } = require("@netlify/blobs");

const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  try {
    const store = getStore(BLOB_STORE_NAME);
    const eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" }); // Pega como JSON

    if (!eventList || !Array.isArray(eventList) || eventList.length === 0) {
      return {
        statusCode: 200, // Retorna 200 com lista vazia em vez de 404
        body: JSON.stringify([]), // Retorna um array vazio
        headers: { 'Content-Type': 'application/json' }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(eventList), // Retorna a lista de eventos (apenas relevantInfo de cada)
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("Erro ao buscar lista de eventos do Netlify Blobs:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao buscar dados dos eventos.", error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};