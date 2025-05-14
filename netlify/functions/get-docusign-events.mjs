// netlify/functions/get-docusign-events.mjs
import { getStore } from "@netlify/blobs"; // Usando import

const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

export const handler = async function(event, context) { // Usando export const handler
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  try {
    const store = getStore(BLOB_STORE_NAME);
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
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao buscar dados dos eventos.", error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};