// netlify/functions/navigator-actions.js
const { ApiClient } = require('docusign-nna'); // API do Navigator (Insights)
const {
  ApiClient: eSignApiClient, // Renomeado para evitar conflito
} = require('docusign-esign'); 
const { Buffer } = require('buffer');

// Reutiliza a função de autenticação, adaptada para a API Navigator
async function getNavigatorApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  
  // A Navigator API usa um base path diferente
  const navigatorBasePath = 'https://apps-d.docusign.com/navigator/v1';

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer) {
    throw new Error("Variáveis de ambiente Docusign incompletas para autenticação.");
  }

  const rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8');
  
  // A API do Navigator é construída sobre a API de eSignature para autenticação
  const apiClient = new eSignApiClient({ basePath: authServer });

  try {
    console.log("[navigator-actions] Solicitando token JWT para Navigator API...");
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['nna_read', 'nna_write'], // Scopes específicos para Navigator/Insights
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );

    const accessToken = results.body.access_token;
    console.log("[navigator-actions] Token de acesso obtido com sucesso.");

    // Cria um cliente específico para a Navigator API, já autenticado
    const navApiClient = new ApiClient({
      basePath: navigatorBasePath,
      accessToken: accessToken,
    });
    
    return navApiClient;
  } catch (err) {
    console.error("[navigator-actions] FALHA NA AUTENTICAÇÃO JWT:", err);
    throw new Error("Erro ao autenticar com a API DocuSign Navigator.");
  }
}

// Função para retornar dados de um dataset (com mock para demonstração)
async function getDashboardData(navApiClient, accountId, datasetId) {
    // NOTA: Em um cenário real, você faria uma chamada à API aqui, como:
    // const datasetsApi = new DatasetsApi(navApiClient);
    // const data = await datasetsApi.getDatasetData(accountId, datasetId, { /* opções */ });
    // return data;
    
    // Para fins de demonstração imediata, retornamos dados mockados.
    // Isso permite que você construa e visualize o frontend sem precisar ter um dataset populado.
    console.log(`[navigator-actions] Retornando dados MOCK para o datasetId: ${datasetId}`);
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
    const navApiClient = await getNavigatorApiClient();
    let resultData;

    switch (action) {
      case 'get-dashboard-data':
        // ATENÇÃO: Substitua este ID pelo ID do seu Dataset real quando ele existir.
        const datasetId = payload?.datasetId || 'SEU_DATASET_ID_AQUI'; 
        resultData = await getDashboardData(navApiClient, accountId, datasetId);
        break;
      
      // Você pode adicionar outras ações aqui no futuro, como 'list-datasets', 'start-extraction', etc.
      // case 'list-datasets':
      //   const datasetsApi = new DatasetsApi(navApiClient);
      //   resultData = await datasetsApi.listDatasets(accountId);
      //   break;

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
