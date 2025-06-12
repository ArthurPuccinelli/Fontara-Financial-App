// netlify/functions/navigator-actions.js
const { ApiClient: eSignApiClient } = require('docusign-esign');
const { Buffer } = require('buffer');
const fetch = require('node-fetch');

/**
 * Obtém um token de acesso JWT com os escopos necessários.
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

  const requiredScopes = ["signature", "impersonation", "nna_read"];

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
 * Busca a lista de acordos processados pela Navigator API.
 * Se falhar, retorna dados de exemplo.
 * @param {string} accessToken - O token de acesso Bearer.
 * @param {string} accountId - O ID da conta DocuSign.
 * @returns {Promise<object>} A resposta da API com a lista de acordos ou dados de exemplo.
 */
async function getAgreementsList(accessToken, accountId) {
    // Este é o endpoint correto para listar acordos, conforme a documentação
    const navigatorApiBasePath = 'https://apps-d.docusign.com/api/navigator/v1';
    const endpoint = `${navigatorApiBasePath}/accounts/${accountId}/agreements`;

    try {
        console.log(`[navigator-actions] Fazendo chamada GET para listar acordos: ${endpoint}`);
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            // Se a API retornar um erro (como 404), lançamos uma exceção que será capturada abaixo.
            const errorBody = await response.text();
            console.error(`[navigator-actions] Erro na API Navigator [${response.status}]:`, errorBody);
            throw new Error(`A API Navigator retornou um erro: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("[navigator-actions] Lista de acordos recebida com sucesso.");
        return data;

    } catch (error) {
        console.warn(`[navigator-actions] AVISO: Falha ao buscar dados reais da Navigator API. Motivo: ${error.message}. Retornando dados de EXEMPLO.`);
        // Fallback para dados de exemplo se a chamada real falhar.
        return {
            value: [
                { id: "mock-001", title: "Contrato de Previdência Exemplo", type: "PGBL", status: "Concluído", effectiveDate: "2025-06-10T10:00:00Z" },
                { id: "mock-002", title: "Acordo de Investimento Exemplo", type: "Renda Fixa", status: "Concluído", effectiveDate: "2025-06-08T11:30:00Z" },
                { id: "mock-003", title: "Termo de Adesão Exemplo", type: "VGBL", status: "Concluído", effectiveDate: "2025-05-20T15:00:00Z" },
                { id: "mock-004", title: "Contrato de Serviço Exemplo", type: "Consultoria", status: "Concluído", effectiveDate: "2025-05-15T09:00:00Z" },
            ]
        };
    }
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
    return { statusCode: 500, body: "Configuração do servidor incompleta." };
  }

  try {
    const accessToken = await getAccessToken();
    let resultData;

    switch (action) {
      case 'get-agreements-list':
        resultData = await getAgreementsList(accessToken, accountId);
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
