// netlify/functions/navigator-actions.js
const { ApiClient: eSignApiClient } = require('docusign-esign'); // Usado apenas para autenticação JWT
const { Buffer } = require('buffer');
const fetch = require('node-fetch'); // Lembre-se de 'npm install node-fetch@2'

// Função para obter o Token de Acesso usando o fluxo JWT
async function getAccessToken() {
  console.log("--- [LOG PASSO 1] Iniciando processo de autenticação (getAccessToken). ---");
  
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer) {
    console.error("[ERRO] Variáveis de ambiente Docusign para autenticação estão faltando.");
    throw new Error("Variáveis de ambiente Docusign incompletas para autenticação.");
  }
  console.log("[LOG] Todas as variáveis de ambiente de autenticação foram encontradas.");

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
    console.log(`[LOG] Solicitando token JWT para os escopos: ${requiredScopes.join(' ')}`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      requiredScopes,
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );

    const accessToken = results.body.access_token;
    console.log("[LOG] Token de acesso JWT obtido com sucesso.");
    console.log("--- [LOG PASSO 1] Finalizado com sucesso. ---");
    return accessToken;
  } catch (err) {
    console.error("[ERRO] FALHA NA AUTENTICAÇÃO JWT:", err);
    if (err.response && err.response.body && err.response.body.error_description) {
        const errorDesc = err.response.body.error_description;
        console.error("Detalhe do erro DocuSign:", errorDesc);
        throw new Error(`Erro ao autenticar: ${errorDesc}`);
    }
    throw new Error("Erro ao autenticar com a API DocuSign.");
  }
}

// Função de teste para listar os datasets
async function listDatasets(accessToken, accountId) {
    console.log("--- [LOG PASSO 2.1] Iniciando chamada à API Navigator (listDatasets). ---");
    const navigatorApiBasePath = 'https://apps-d.docusign.com/api/navigator/v1';
    const endpoint = `${navigatorApiBasePath}/accounts/${accountId}/datasets`;

    try {
        console.log(`[LOG] Endpoint da API: ${endpoint}`);
        console.log("[LOG] Fazendo chamada fetch para a API DocuSign Navigator...");
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`[LOG] Resposta da API recebida com status: ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[ERRO] A API Navigator retornou um status de erro. Corpo da resposta:`, errorBody);
            throw new Error(`A API Navigator retornou um erro: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[LOG] Resposta da API parseada como JSON com sucesso.");
        console.log("--- [LOG PASSO 2.1] Finalizado com sucesso. ---");
        return data;

    } catch (error) {
        console.error("[ERRO] Falha ao listar datasets da Navigator API:", error);
        throw error;
    }
}


// Função para retornar dados de um dataset (com mock para demonstração)
async function getDashboardData(accessToken, accountId, datasetId) {
    console.log("--- [LOG PASSO 2.2] Retornando dados MOCKADOS (getDashboardData). ---");
    // Esta função não faz uma chamada real, apenas retorna dados de exemplo.
    console.log(`[LOG] O frontend pediu dados para o datasetId: ${datasetId}, mas estamos em modo de demonstração.`);
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
  console.log("=== [INÍCIO DA EXECUÇÃO] Função 'navigator-actions' foi acionada. ===");

  if (event.httpMethod !== "POST") {
    console.warn(`[AVISO] Método HTTP não permitido: ${event.httpMethod}`);
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  let action;
  try {
    const body = JSON.parse(event.body);
    action = body.action;
    console.log(`[LOG] Ação recebida da requisição: '${action}'`);
  } catch (e) {
    console.error("[ERRO] Corpo da requisição JSON inválido ou ausente.");
    return { statusCode: 400, body: "Corpo da requisição JSON inválido." };
  }

  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  if (!accountId) {
    console.error("[ERRO] Variável de ambiente DOCUSIGN_ACCOUNT_ID não está configurada.");
    return { statusCode: 500, body: "DOCUSIGN_ACCOUNT_ID não configurado." };
  }

  try {
    const accessToken = await getAccessToken();
    let resultData;

    console.log(`[LOG] Executando o bloco switch para a ação: '${action}'`);
    switch (action) {
      case 'test-api-connection':
        resultData = await listDatasets(accessToken, accountId);
        break;

      case 'get-dashboard-data':
        resultData = await getDashboardData(accessToken, accountId, 'SEU_DATASET_ID_AQUI');
        break;
      
      default:
        console.warn(`[AVISO] Ação '${action}' não é reconhecida.`);
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }
    
    console.log("[LOG] Ação processada com sucesso. Retornando resposta 200 (OK).");
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(resultData),
    };

  } catch (error) {
    console.error(`[ERRO GERAL] Falha no handler ao processar a ação '${action}'.`);
    console.error("Detalhes do erro capturado:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Erro ao processar requisição Navigator.", details: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  } finally {
      console.log("=== [FIM DA EXECUÇÃO] Função 'navigator-actions'. ===");
  }
};
