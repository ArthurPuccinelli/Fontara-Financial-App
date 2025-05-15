// netlify/functions/get-docusign-events.js
const { getStore } = require("@netlify/blobs"); // Usando require

const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  try {
    const store = getStore(BLOB_STORE_NAME); // Esta chamada pode ser o ponto do erro
    const eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });

    if (!eventList || !Array.isArray(eventList) || eventList.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify([]),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify(eventList),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("Erro ao buscar lista de eventos do Netlify Blobs:", error);
    // Se o erro for ERR_REQUIRE_ESM, ele pode ocorrer aqui na chamada a getStore.
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao buscar dados dos eventos.", error: error.message, stack: error.stack }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};