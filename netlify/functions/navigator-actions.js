// netlify/functions/navigator-actions.js
const { ApiClient: eSignApiClient } = require('docusign-esign'); // Usado apenas para autenticação JWT
const { Buffer } = require('buffer');
const fetch = require('node-fetch'); // Lembre-se de 'npm install node-fetch@2'

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
  
  const apiClient = new eSignApiClient();
  apiClient.setOAuthBasePath(authServer);

  const requiredScopes = [
      "signature",
      "impersonation",
      "nna_read",
      "nna_write"
  ];

  try {
    console.log("[navigator-actions] Solicitando token JWT com scopes:", requiredScopes.join(' '));
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      requiredScopes,
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );

    const accessToken = results.body.access_token;
    console.log("[navigator-actions] Token de acesso obtido com sucesso.");
    return accessToken;
  } catch (err) {
    console.error("[navigator-actions] FALHA NA AUTENTICAÇÃO JWT:", err);
    if (err.response && err.response.body && err.response.body.error_description) {
        console.error("Detalhe do erro DocuSign:", err.response.body.error_description);
        throw new Error(`Erro ao autenticar: ${err.response.body.error_description}`);
    }
    throw new Error("Erro ao autenticar com a API DocuSign.");
  }
}

// Função de teste para listar os datasets
async function listDatasets(accessToken, accountId) {
    // --- CORREÇÃO PRINCIPAL ---
    // A URL base da API Navigator estava incorreta.
    const navigatorApiBasePath = 'https://apps-d.docusign.com/api/navigator/v1'; // URL CORRIGIDA
    const endpoint = `${navigatorApiBasePath}/accounts/${accountId}/datasets`;

    try {
        console.log(`[navigator-actions] Fazendo chamada de TESTE GET para: ${endpoint}`);
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
        console.log("[navigator-actions] Resposta da listagem de datasets recebida com sucesso.");
        return data;

    } catch (error) {
        console.error("[navigator-actions] Falha ao listar datasets da Navigator API:", error);
        throw error;
    }
}


// Função para retornar dados de um dataset (com mock para demonstração)
async function getDashboardData(accessToken, accountId, datasetId) {
    console.log(`[navigator-actions] Retornando dados MOCKADOS para o datasetId: ${datasetId}`);
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


exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let action;
  try {
    const body = JSON.parse(event.body);
    action = body.action;
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
      case 'test-api-connection':
        resultData = await listDatasets(accessToken, accountId);
        break;

      case 'get-dashboard-data':
        resultData = await getDashboardData(accessToken, accountId, 'SEU_DATASET_ID_AQUI');
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
    console.error(`[navigator-actions] ERRO FINAL NO HANDLER para ação '${action}':`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao processar requisição Navigator.", details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
