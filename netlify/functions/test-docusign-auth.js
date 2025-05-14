// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');

async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  let rsaPrivateKeyFromEnv = process.env.DOCUSIGN_RSA_PRIVATE_KEY; // Pega a chave da variável de ambiente

  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;

  // Log para verificar as variáveis de ambiente (exceto a chave completa por segurança no log público)
  console.log("[test-docusign-auth] IK:", ik ? "Presente" : "AUSENTE");
  console.log("[test-docusign-auth] UserID:", userId ? "Presente" : "AUSENTE");
  console.log("[test-docusign-auth] AuthServer:", authServer ? authServer : "AUSENTE");
  console.log("[test-docusign-auth] BasePath:", basePath ? basePath : "AUSENTE");
  console.log("[test-docusign-auth] RSA Key presente na env var?", !!rsaPrivateKeyFromEnv);

  if (!ik || !userId || !rsaPrivateKeyFromEnv || !authServer || !basePath) {
    const missingVars = [];
    if (!ik) missingVars.push("DOCUSIGN_IK");
    if (!userId) missingVars.push("DOCUSIGN_USER_ID");
    if (!rsaPrivateKeyFromEnv) missingVars.push("DOCUSIGN_RSA_PRIVATE_KEY");
    if (!authServer) missingVars.push("DOCUSIGN_AUTH_SERVER");
    if (!basePath) missingVars.push("DOCUSIGN_BASE_PATH");
    const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
    console.error(`[test-docusign-auth] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  // IMPORTANTE: Tenta formatar a chave privada.
  // A suposição é que a variável de ambiente no Netlify pode ter convertido
  // quebras de linha reais em sequências literais '\\n'.
  const rsaPrivateKeyFormatted = rsaPrivateKeyFromEnv.replace(/\\n/g, '\n');

  // Log para depuração da chave (APENAS PARA TESTE, remova ou mascare em produção se logar a chave inteira)
  // Mostra apenas o início e o fim para confirmar o formato geral
  console.log("[test-docusign-auth] Chave Privada RSA (formatada, início):", rsaPrivateKeyFormatted.substring(0, 50) + "...");
  console.log("[test-docusign-auth] Chave Privada RSA (formatada, fim): ..." + rsaPrivateKeyFormatted.substring(rsaPrivateKeyFormatted.length - 50));


  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log(`[test-docusign-auth] Tentando autenticação JWT para User ID: ${userId}`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'],
      Buffer.from(rsaPrivateKeyFormatted), // Usa a chave formatada
      3600
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("[test-docusign-auth] Erro ao obter token de acesso Docusign:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    // Tenta extrair a mensagem de erro específica da resposta do Docusign
    if (err.response && err.response.body) {
        let errorBody = err.response.body;
        if (typeof errorBody === 'string') {
            try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora erro de parse, usa como string */ }
        }
        const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        errorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido. Use GET." };
  }

  console.log("[test-docusign-auth] Função de teste de autenticação Docusign iniciada.");

  try {
    const apiClient = await getAuthenticatedApiClient(); // Tenta autenticar
    const usersApi = new docusign.UsersApi(apiClient);
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    if(!accountId){
        console.error("[test-docusign-auth] DOCUSIGN_ACCOUNT_ID não definido nas variáveis de ambiente.");
        throw new Error("DOCUSIGN_ACCOUNT_ID não configurado.");
    }

    console.log(`[test-docusign-auth] Buscando informações do usuário ${process.env.DOCUSIGN_USER_ID} na conta ${accountId}`);
    const userInfo = await usersApi.getUser(accountId, process.env.DOCUSIGN_USER_ID);

    console.log("[test-docusign-auth] Informações do usuário obtidas com sucesso:", userInfo);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Autenticação com Docusign e chamada API básica BEM-SUCEDIDAS!",
        userInfo: {
          userName: userInfo.userName,
          email: userInfo.email,
          userId: userInfo.userId,
          accountId: userInfo.accountId, // Corrigido para pegar o accountId do objeto userInfo
          accountName: userInfo.accountName 
        }
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("[test-docusign-auth] ERRO DURANTE O TESTE:", error.message);
    // Log do stack do erro para mais detalhes
    if(error.stack) {
        console.error("[test-docusign-auth] Stack do Erro:", error.stack);
    }
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Falha no teste de autenticação/API Docusign.",
        error: error.message,
        // Adiciona mais detalhes do erro se disponíveis, por exemplo, da resposta do Docusign
        details: error.response && error.response.body ? (typeof error.response.body === 'string' ? error.response.body : JSON.stringify(error.response.body)) : "Sem detalhes adicionais da resposta."
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};