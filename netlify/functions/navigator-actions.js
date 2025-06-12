// netlify/functions/navigator-actions.js
const { ApiClient: eSignApiClient } = require('docusign-esign');
const { Buffer } = require('buffer');
const fetch = require('node-fetch'); // Lembre-se de 'npm install node-fetch@2'

/**
 * Obtém um token de acesso JWT usando as credenciais do ambiente.
 * @returns {Promise<string>} O token de acesso.
 */
async function getAccessToken() {
  console.log("[navigator-actions] Iniciando autenticação JWT.");
  
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer) {
    console.error("[navigator-actions] ERRO: Variáveis de ambiente Docusign incompletas.");
    throw new Error("Variáveis de ambiente Docusign incompletas para autenticação.");
  }

  const rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8');
  
  const apiClient = new eSignApiClient();
  apiClient.setOAuthBasePath(authServer);

  const requiredScopes = ["signature", "impersonation", "nna_read", "nna_write"];

  try {
    const results = await apiClient.requestJWTUserToken(ik, userId, requiredScopes, Buffer.from(rsaPrivateKeyPemString), 3600);
    const accessToken = results.body.access_token;
    console.log("[navigator-actions] Token de acesso JWT obtido com sucesso.");
    return accessToken;
  } catch (err) {
    console.error("[navigator-actions] FALHA NA AUTENTICAÇÃO JWT:", err.response ? err.response.body : err.message);
    throw new Error("Erro ao autenticar com a API DocuSign.");
  }
}

/**
 * Função de teste para listar os datasets disponíveis na conta.
 * @param {string} accessToken - O token de acesso Bearer.
 * @param {string} accountId - O ID da conta DocuSign.
 * @returns {Promise<object>} A resposta da API.
 */
async function listDatasets(accessToken, accountId) {
    const navigatorApiBasePath = 'https://apps-d.docusign.com/api/navigator/v1';
    const endpoint = `${navigatorApiBasePath}/accounts/${accountId}/datasets`;

    console.log(`[navigator-actions] Fazendo chamada GET para listar datasets: ${endpoint}`);
    const response = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[navigator-actions] Erro na API Navigator [${response.status}]:`, errorBody);
        throw new Error(`A API Navigator retornou um erro: ${response.statusText}`);
    }

    const data = await response.json();
    console.log("[navigator-actions] Datasets listados com sucesso.");
    return data;
}

/**
 * Função que retorna dados para o painel de insights.
 * ATENÇÃO: Atualmente retorna dados MOCKADOS para demonstração.
 * @returns {Promise<object>} Um objeto com dados de exemplo.
 */
async function getDashboardData() {
    console.log("[navigator-actions] Retornando dados MOCKADOS para o dashboard.");
    return {
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

/**
 * Handler principal da Netlify Function.
 */
exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return { statusCode: 405, body: "Method Not Allowed" };

  let action;
  try {
    action = JSON.parse(event.body).action;
  } catch (e) {
    return { statusCode: 400, body: "Corpo da requisição JSON inválido." };
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  if (!accountId) {
    console.error("[navigator-actions] ERRO: DOCUSIGN_ACCOUNT_ID não configurado.");
    return { statusCode: 500, body: "Configuração do servidor incompleta." };
  }

  try {
    const accessToken = await getAccessToken();
    let resultData;

    switch (action) {
      case 'list-datasets':
        resultData = await listDatasets(accessToken, accountId);
        break;
      case 'get-dashboard-data':
        // No futuro, esta ação chamaria a API para buscar dados de um dataset específico.
        // Por enquanto, usa a função mock.
        resultData = await getDashboardData();
        break;
      default:
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData),
    };

  } catch (error) {
    console.error(`[navigator-actions] ERRO GERAL no handler para ação '${action}':`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao processar requisição Navigator.", details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};

