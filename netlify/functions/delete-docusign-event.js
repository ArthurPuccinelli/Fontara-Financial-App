// netlify/functions/delete-docusign-event.js
const { getStore } = require("@netlify/blobs");

const MAX_EVENTS_TO_STORE = 100; // Consistente com o listener
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  let eventIdToDelete;
  try {
    const body = JSON.parse(event.body);
    eventIdToDelete = body.eventId;
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: "Requisição mal formatada ou ID do evento ausente."}) };
  }

  if (!eventIdToDelete) {
    return { statusCode: 400, body: JSON.stringify({ error: "ID do evento para exclusão não fornecido."}) };
  }

  console.log(`[delete-docusign-event] Tentando excluir evento com ID: ${eventIdToDelete}`);

  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;

    if (!siteID || !token) {
      console.error("[delete-docusign-event] Variáveis NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidas.");
      throw new Error("Configuração de Blobs ausente.");
    }

    const store = getStore({ name: BLOB_STORE_NAME, siteID: siteID, token: token, consistency: "strong" });
    let eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });

    if (!eventList || !Array.isArray(eventList)) {
      console.log("[delete-docusign-event] Lista de eventos não encontrada ou vazia. Nada a excluir.");
      return { statusCode: 404, body: JSON.stringify({ message: "Evento não encontrado ou lista vazia." }) };
    }

    const initialLength = eventList.length;
    eventList = eventList.filter(eventEntry => eventEntry.id !== eventIdToDelete);

    if (eventList.length === initialLength) {
      console.log(`[delete-docusign-event] Evento com ID ${eventIdToDelete} não encontrado na lista.`);
      return { statusCode: 404, body: JSON.stringify({ message: `Evento com ID ${eventIdToDelete} não encontrado.` }) };
    }

    await store.setJSON(BLOB_KEY_EVENT_LIST, eventList);
    console.log(`[delete-docusign-event] Evento ${eventIdToDelete} excluído. Lista atualizada. Total: ${eventList.length}`);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Evento excluído com sucesso.", remainingEvents: eventList.length }),
    };

  } catch (error) {
    console.error("[delete-docusign-event] Erro ao excluir evento:", error.name, error.message);
    if(error.stack) console.error("[delete-docusign-event] Stack:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Erro ao excluir evento.", errorName: error.name, errorMessage: error.message }),
    };
  }
};