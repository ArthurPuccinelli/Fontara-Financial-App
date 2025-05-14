// Dentro de netlify/functions/test-docusign-auth.js

async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64 = process.env.DOCUSIGN_RSA_PEM_BASE64; // Nova variável
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  console.log("[test-docusign-auth] ---- Variáveis de Ambiente Recebidas ----");
  console.log("[test-docusign-auth] DOCUSIGN_IK:", ik ? "Presente" : "AUSENTE!");
  // ... (logs para outras variáveis como antes) ...
  console.log("[test-docusign-auth] DOCUSIGN_RSA_PEM_BASE64 presente?", !!rsaPrivateKeyBase64);
  console.log("[test-docusign-auth] -----------------------------------------");

  if (!ik || !userId || !rsaPrivateKeyBase64 || !authServer || !basePath || !accountId) {
    // ... (mensagem de erro para variáveis ausentes) ...
    throw new Error("Variáveis de ambiente Docusign incompletas ou chave Base64 ausente.");
  }

  let rsaPrivateKeyPem;
  try {
    // Decodifica a string Base64 para obter a string PEM original
    rsaPrivateKeyPem = Buffer.from(rsaPrivateKeyBase64, 'base64').toString('utf-8');
  } catch (e) {
    console.error("[test-docusign-auth] ERRO AO DECODIFICAR A CHAVE PRIVADA BASE64:", e);
    throw new Error("Falha ao decodificar a chave privada Base64.");
  }

  console.log("[test-docusign-auth] ----- INÍCIO CHAVE PEM DECODIFICADA DE BASE64 -----");
  console.log("Primeiros 70 chars da chave PEM decodificada:", rsaPrivateKeyPem.substring(0, 70) + "...");
  console.log("Últimos 70 chars da chave PEM decodificada: ..." + rsaPrivateKeyPem.substring(rsaPrivateKeyPem.length - 70));
  console.log("[test-docusign-auth] ----- FIM CHAVE PEM DECODIFICADA DE BASE64 -----");

  // Verificação crucial: a chave PEM decodificada DEVE começar e terminar corretamente
  if (!rsaPrivateKeyPem.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPem.endsWith("-----END RSA PRIVATE KEY-----")) {
      console.error("[test-docusign-auth] ERRO: Chave PEM decodificada de Base64 está mal formatada ou incompleta.");
      throw new Error("Chave privada PEM decodificada de Base64 está inválida.");
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log(`[test-docusign-auth] Tentando autenticação JWT com chave PEM decodificada.`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'],
      Buffer.from(rsaPrivateKeyPem), // Usa a string PEM decodificada e convertida para Buffer
      3600
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    // ... (tratamento de erro como antes, logando err) ...
    console.error("[test-docusign-auth] Erro ao obter token de acesso Docusign:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && err.response.body) {
        let errorBody = err.response.body;
        if (typeof errorBody === 'string') {
            try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ }
        }
        const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        errorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// O restante da função handler permanece o mesmo
exports.handler = async (event, context) => {
    // ... (código do handler como na sua última versão funcional, chamando getAuthenticatedApiClient) ...
      if (event.httpMethod !== "GET") {
        return { statusCode: 405, body: "Método não permitido. Use GET." };
      }

      console.log("[test-docusign-auth] Função de teste de autenticação Docusign iniciada.");

      try {
        const apiClient = await getAuthenticatedApiClient();
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
              accountId: userInfo.accountId, 
              accountName: userInfo.accountName 
            }
          }),
          headers: { 'Content-Type': 'application/json' }
        };

      } catch (error) {
        console.error("[test-docusign-auth] ERRO DURANTE O TESTE:", error.message);
        if(error.stack) {
            console.error("[test-docusign-auth] Stack do Erro:", error.stack);
        }
        return {
          statusCode: 500,
          body: JSON.stringify({
            message: "Falha no teste de autenticação/API Docusign.",
            error: error.message,
            details: error.response && error.response.body ? (typeof error.response.body === 'string' ? error.response.body : JSON.stringify(error.response.body)) : "Sem detalhes adicionais da resposta."
          }),
          headers: { 'Content-Type': 'application/json' }
        };
      }
};