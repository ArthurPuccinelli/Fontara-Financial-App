// netlify/functions/get-docusign-events.js
const { getStore } = require("@netlify/blobs");

// Constantes definidas no escopo do módulo
const BLOB_STORE_NAME = "docusignEvents";
const BLOB_KEY_EVENT_LIST = "recent_event_list";

exports.handler = async function(event, context) {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  console.log("[get-docusign-events] Solicitação recebida.");

  try {
    const siteID = process.env.NETLIFY_SITE_ID;
    const token = process.env.NETLIFY_API_ACCESS_TOKEN;

    console.log("[get-docusign-events] [Blobs Debug] Tentando usar Netlify Blobs.");
    console.log("[get-docusign-events] [Blobs Debug] process.env.NETLIFY_SITE_ID:", siteID ? `"${siteID}"` : "NÃO DEFINIDO");
    console.log("[get-docusign-events] [Blobs Debug] process.env.NETLIFY_API_ACCESS_TOKEN presente?", !!token);

    if (!siteID || !token) {
      console.error("[get-docusign-events] ERRO CRÍTICO: Variáveis NETLIFY_SITE_ID ou NETLIFY_API_ACCESS_TOKEN não definidas para Blobs.");
      throw new Error("Configuração de Blobs ausente: siteID ou token não definidos.");
    }
    
    const store = getStore({
      name: BLOB_STORE_NAME,
      siteID: siteID,
      token: token,
      consistency: "strong" // Para garantir que estamos lendo o dado mais recente possível
    });
        
    const eventList = await store.get(BLOB_KEY_EVENT_LIST, { type: "json" });
    console.log("[get-docusign-events] [Blobs Debug] Lista de eventos lida do store:", eventList ? `${eventList.length} eventos` : "lista não existe/vazia");

    if (!eventList || !Array.isArray(eventList) || eventList.length === 0) {
      return {
        statusCode: 200, // Retorna sucesso com array vazio se não houver eventos
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
    console.error("[get-docusign-events] Erro ao buscar lista de eventos do Netlify Blobs:", error.name, error.message);
    if(error.stack) console.error("[get-docusign-events] Stack do erro de Blob:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
          message: "Erro ao buscar dados dos eventos.", 
          errorName: error.name,
          errorMessage: error.message 
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};