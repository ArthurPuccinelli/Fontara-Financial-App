// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');

async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  // Lê a chave PEM que foi previamente codificada em Base64
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64; 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  console.log("[test-docusign-auth] ---- Variáveis de Ambiente Lidas ----");
  console.log("[test-docusign-auth] DOCUSIGN_IK:", ik ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_USER_ID:", userId ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_ACCOUNT_ID:", accountId ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_AUTH_SERVER:", authServer || "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_BASE_PATH:", basePath || "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_RSA_PEM_AS_BASE64 presente?", !!rsaPrivateKeyBase64Encoded);
  console.log("[test-docusign-auth] -----------------------------------------");

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer || !basePath || !accountId) {
    const missingVars = ['DOCUSIGN_IK', 'DOCUSIGN_USER_ID', 'DOCUSIGN_RSA_PEM_AS_BASE64', 'DOCUSIGN_AUTH_SERVER', 'DOCUSIGN_BASE_PATH', 'DOCUSIGN_ACCOUNT_ID']
        .filter(v => !process.env[v]);
    const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
    console.error(`[test-docusign-auth] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  let rsaPrivateKeyPemString;
  try {
    // Decodifica a string Base64 para obter a string PEM original (com quebras de linha)
    rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8');
  } catch (e) {
    console.error("[test-docusign-auth] ERRO AO DECODIFICAR A CHAVE PRIVADA DA STRING BASE64:", e);
    throw new Error("Falha ao decodificar a chave privada armazenada em Base64. Verifique o valor da variável de ambiente DOCUSIGN_RSA_PEM_AS_BASE64.");
  }

  // Log para verificar a chave PEM decodificada
  console.log("[test-docusign-auth] ----- INÍCIO CHAVE PEM DECODIFICADA DE BASE64 -----");
  console.log("Primeiros 70 chars da chave PEM decodificada:", rsaPrivateKeyPemString.substring(0, 70));
  console.log("Últimos 70 chars da chave PEM decodificada:", rsaPrivateKeyPemString.substring(rsaPrivateKeyPemString.length - 70));
  console.log("[test-docusign-auth] ----- FIM CHAVE PEM DECODIFICADA DE BASE64 -----");
  
  // Verificação crucial: a chave PEM decodificada DEVE começar e terminar corretamente
  if (!rsaPrivateKeyPemString.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPemString.endsWith("-----END RSA PRIVATE KEY-----")) {
      console.error("[test-docusign-auth] ERRO: Chave PEM decodificada de Base64 está mal formatada ou incompleta (delimitadores PEM ausentes/incorretos).");
      console.log("Conteúdo decodificado (parcial para depuração):\n" + rsaPrivateKeyPemString.substring(0,200) + "\n...\n" + rsaPrivateKeyPemString.substring(rsaPrivateKeyPemString.length - 200));
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
      Buffer.from(rsaPrivateKeyPemString), // Usa a string PEM decodificada e convertida para Buffer
      3600
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("[test-docusign-auth] Erro ao obter token de acesso Docusign:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && err.response.body) {
        let errorBody = err.response.body;
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
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
    const apiClient = await getAuthenticatedApiClient();
    const usersApi = new docusign.UsersApi(apiClient);
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    if(!accountId) throw new Error("DOCUSIGN_ACCOUNT_ID não configurado.");
    
    console.log(`[test-docusign-auth] Buscando informações do usuário ${process.env.DOCUSIGN_USER_ID} na conta ${accountId}`);
    const userInfo = await usersApi.getUser(accountId, process.env.DOCUSIGN_USER_ID);
    console.log("[test-docusign-auth] Informações do usuário obtidas com sucesso.");

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Autenticação com Docusign e chamada API básica BEM-SUCEDIDAS!",
        userInfo: { userName: userInfo.userName, email: userInfo.email, userId: userInfo.userId, accountId: userInfo.accountId, accountName: userInfo.accountName }
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error("[test-docusign-auth] ERRO DURANTE O TESTE:", error.message);
    if(error.stack) console.error("[test-docusign-auth] Stack do Erro:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: "Falha no teste de autenticação/API Docusign.", error: error.message, details: error.response && error.response.body ? (typeof error.response.body === 'string' ? error.response.body : JSON.stringify(error.response.body)) : null }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};