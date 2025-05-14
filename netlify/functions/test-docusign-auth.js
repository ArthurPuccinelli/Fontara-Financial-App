// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');

// Função auxiliar para obter o cliente API autenticado (copiada/adaptada de docusign-actions.js)
async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  let rsaPrivateKeyContent = process.env.DOCUSIGN_RSA_PRIVATE_KEY;

  if (rsaPrivateKeyContent) {
      rsaPrivateKeyContent = rsaPrivateKeyContent.replace(/\\n/g, '\n');
  } else {
      console.error("Variável de ambiente DOCUSIGN_RSA_PRIVATE_KEY não está definida ou está vazia.");
      throw new Error("Configuração crítica ausente: Chave Privada RSA do Docusign.");
  }

  const authServer = process.env.DOCUSIGN_AUTH_SERVER; // Ex: account-d.docusign.com
  const basePath = process.env.DOCUSIGN_BASE_PATH;     // Ex: https://demo.docusign.net/restapi

  if (!ik || !userId || !authServer || !basePath) {
    console.error("Variáveis de ambiente Docusign incompletas para autenticação:", 
        { ik_present: !!ik, userId_present: !!userId, authServer_present: !!authServer, basePath_present: !!basePath });
    throw new Error("Variáveis de ambiente do Docusign para autenticação não configuradas corretamente.");
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);
  console.log(`[test-docusign-auth] Tentando autenticação JWT para User ID: ${userId} na IK: ${ik} via ${authServer}`);

  try {
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'], // Escopos necessários
      Buffer.from(rsaPrivateKeyContent),
      3600 // Expiração do token em segundos
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("[test-docusign-auth] Erro ao obter token de acesso Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && err.response.body) {
        let errorBody = err.response.body;
        if (typeof errorBody === 'string') {
            try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ }
        }
        errorMessage += ` Detalhe: ${errorBody.error_description || errorBody.error || JSON.stringify(errorBody)}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

export const handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido. Use GET." };
  }

  console.log("[test-docusign-auth] Função de teste iniciada.");

  try {
    const apiClient = await getAuthenticatedApiClient();
    const usersApi = new docusign.UsersApi(apiClient);
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    console.log(`[test-docusign-auth] Buscando informações do usuário ${process.env.DOCUSIGN_USER_ID} na conta ${accountId}`);
    
    // Faz uma chamada simples para verificar se o token funciona, como obter informações do usuário impersonado.
    // Nota: DOCUSIGN_USER_ID é o ID do usuário que você está impersonando.
    const userInfo = await usersApi.getUser(accountId, process.env.DOCUSIGN_USER_ID);
    
    console.log("[test-docusign-auth] Informações do usuário obtidas com sucesso:", userInfo);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Autenticação com Docusign e chamada API básica bem-sucedidas!",
        userInfo: {
          userName: userInfo.userName,
          email: userInfo.email,
          userId: userInfo.userId,
          accountId: userInfo.accountName // ou accountId se preferir
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("[test-docusign-auth] Erro durante o teste da API Docusign:", error.message, error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Falha no teste de autenticação/API Docusign.",
        error: error.message,
        details: error.response ? error.response.body : "Sem detalhes adicionais da resposta."
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};