// netlify/functions/get-docusign-events.js
const { getStore } = require("@netlify/blobs");

// ... (BLOB_STORE_NAME, BLOB_KEY_EVENT_LIST como antes) ...

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido." };
  }

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

    const eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });

    if (!eventList || !Array.isArray(eventList) || eventList.length === 0) {
      return { /* ... retorna array vazio ... */ };
    }
    return { /* ... retorna eventList ... */ };

  } catch (error) {
    console.error("Erro ao buscar lista de eventos do Netlify Blobs (manual config):", error);
    return { /* ... retorna erro 500 ... */ };
  }
};