// netlify/functions/get-docusign-client-id.js
exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const clientId = process.env.DOCUSIGN_IK; // Sua variável de ambiente

  if (!clientId) {
    console.error("[get-docusign-client-id] DOCUSIGN_IK não está configurado nas variáveis de ambiente do Netlify.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Configuração do servidor incompleta." }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ clientId: clientId }),
    headers: { 'Content-Type': 'application/json' }
  };
};
