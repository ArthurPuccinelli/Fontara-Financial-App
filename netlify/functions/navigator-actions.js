// netlify/functions/navigator-actions.js
const { ApiClient: eSignApiClient } = require('docusign-esign'); // Usado apenas para autenticação JWT
const { Buffer } = require('buffer');
const fetch = require('node-fetch'); // Adicione 'node-fetch' ao seu projeto: npm install node-fetch@2

// Função para obter o Token de Acesso usando o fluxo JWT
async function getAccessToken() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer) {
    throw new Error("Variáveis de ambiente Docusign incompletas para autenticação.");
  }

  const rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8');
  
  // O SDK eSign é uma maneira conveniente de lidar com o fluxo de autenticação JWT
  const apiClient = new eSignApiClient();
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log("[navigator-actions] Solicitando token JWT para API...");
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['nna_read', 'nna_write'], // Scopes para Navigator API (Insights)
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );

    const accessToken = results.body.access_token;
    console.log("[navigator-actions] Token de acesso obtido com sucesso.");
    return accessToken;
  } catch (err) {
    console.error("[navigator-actions] FALHA NA AUTENTICAÇÃO JWT:", err);
    throw new Error("Erro ao autenticar com a API DocuSign.");
  }
}

// Função para buscar dados de um dataset via API REST
async function getDashboardData(accessToken, accountId, datasetId) {
  // O endpoint da Navigator API para obter dados de um dataset
  const navigatorApiBasePath = 'https://apps-d.docusign.com/navigator/api/v1';
  const endpoint = `${navigatorApiBasePath}/accounts/${accountId}/datasets/${datasetId}/data`;

  // Em um cenário real, você faria a chamada à API.
  // O código abaixo está comentado, mas é a implementação correta.
  /*
  try {
    console.log(`[navigator-actions] Fazendo chamada GET para: ${endpoint}`);
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[navigator-actions] Erro na API Navigator: ${response.status} ${response.statusText}`, errorBody);
      throw new Error(`A API Navigator retornou um erro: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[navigator-actions] Dados recebidos da Navigator API.");
    return data;

  } catch (error) {
    console.error("[navigator-actions] Falha ao buscar dados da Navigator API:", error);
    throw error;
  }
  */

  // Para fins de demonstração, retornamos dados MOCKADOS.
  // Isso permite que você construa e visualize o frontend sem precisar ter um dataset populado.
  console.log(`[navigator-actions] Retornando dados MOCKADOS para o datasetId: ${datasetId}`);
  return {
    // Exemplo de dados que a API poderia retornar
    results: [
        { mes: 'Janeiro', contratos: 22, valor_total: 45000 },
        { mes: 'Fevereiro', contratos: 19, valor_total: 39500 },
        { mes: 'Março', contratos: 35, valor_total: 72300 },
        { mes: 'Abril', contratos: 41, valor_total: 85000 },
        { mes: 'Maio', contratos: 38, valor_total: 81200 },
        { mes: 'Junho', contratos: 45, valor_total: 95400 },
    ]
  };
}


exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let action, payload;
  try {
    const body = JSON.parse(event.body);
    action = body.action;
    payload = body.payload;
  } catch (e) {
    return { statusCode: 400, body: "Corpo da requisição JSON inválido." };
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  if (!accountId) {
    return { statusCode: 500, body: "DOCUSIGN_ACCOUNT_ID não configurado." };
  }

  try {
    const accessToken = await getAccessToken();
    let resultData;

    switch (action) {
      case 'get-dashboard-data':
        // ATENÇÃO: Substitua este ID pelo ID do seu Dataset real quando ele existir.
        const datasetId = payload?.datasetId || 'SEU_DATASET_ID_AQUI'; 
        resultData = await getDashboardData(accessToken, accountId, datasetId);
        break;
      
      // Você pode adicionar outras ações aqui no futuro.

      default:
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData),
    };

  } catch (error) {
    console.error(`[navigator-actions] ERRO FINAL NO HANDLER para ação '${action}':`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao processar requisição Navigator.", details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
