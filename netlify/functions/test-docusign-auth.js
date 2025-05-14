// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');

async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  let rsaPrivateKeyFromEnv = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID; // Adicionado para log

  // Log para verificar todas as variáveis de ambiente críticas
  console.log("[test-docusign-auth] ---- Variáveis de Ambiente Recebidas ----");
  console.log("[test-docusign-auth] DOCUSIGN_IK:", ik ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_USER_ID:", userId ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_ACCOUNT_ID:", accountId ? "Presente" : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_AUTH_SERVER:", authServer ? authServer : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_BASE_PATH:", basePath ? basePath : "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_RSA_PRIVATE_KEY presente na env var?", !!rsaPrivateKeyFromEnv);
  console.log("[test-docusign-auth] -----------------------------------------");


  if (!ik || !userId || !rsaPrivateKeyFromEnv || !authServer || !basePath || !accountId) {
    const missingVars = [];
    if (!ik) missingVars.push("DOCUSIGN_IK");
    if (!userId) missingVars.push("DOCUSIGN_USER_ID");
    if (!accountId) missingVars.push("DOCUSIGN_ACCOUNT_ID");
    if (!rsaPrivateKeyFromEnv) missingVars.push("DOCUSIGN_RSA_PRIVATE_KEY");
    if (!authServer) missingVars.push("DOCUSIGN_AUTH_SERVER");
    if (!basePath) missingVars.push("DOCUSIGN_BASE_PATH");
    const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
    console.error(`[test-docusign-auth] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log("[test-docusign-auth] ----- INÍCIO CHAVE PRIVADA BRUTA DA ENV -----");
  // Log com cuidado, talvez apenas alguns caracteres para confirmar o formato original
  // console.log(rsaPrivateKeyFromEnv); // Descomente com cautela para depuração total da string
  console.log("Primeiros 70 chars da chave bruta:", rsaPrivateKeyFromEnv.substring(0,70));
  console.log("Últimos 70 chars da chave bruta:", rsaPrivateKeyFromEnv.substring(rsaPrivateKeyFromEnv.length - 70));
  console.log("[test-docusign-auth] ----- FIM CHAVE PRIVADA BRUTA DA ENV -----");

  // Passo 1: Substituir literais \\n (duas barras) por \n (quebra de linha real)
  // Isso é útil se a variável de ambiente no Netlify foi salva com \\n em vez de quebras de linha.
  let rsaPrivateKeyFormatted = rsaPrivateKeyFromEnv.replace(/\\n/g, '\n');

  // Passo 2: Remover quaisquer espaços em branco no início/fim de CADA LINHA
  rsaPrivateKeyFormatted = rsaPrivateKeyFormatted.split('\n').map(line => line.trim()).join('\n');

  // Passo 3: Garantir que não haja espaços em branco no início ou fim da CHAVE INTEIRA.
  rsaPrivateKeyFormatted = rsaPrivateKeyFormatted.trim();
  
  // Passo 4: Garantir que a chave comece e termine com os delimitadores corretos.
  // E que não haja conteúdo estranho antes ou depois dos delimitadores.
  const beginsWith = "-----BEGIN RSA PRIVATE KEY-----";
  const endsWith = "-----END RSA PRIVATE KEY-----";

  if (!rsaPrivateKeyFormatted.startsWith(beginsWith) || !rsaPrivateKeyFormatted.endsWith(endsWith)) {
      console.error("[test-docusign-auth] ERRO CRÍTICO: A chave privada formatada NÃO começa ou termina com os delimitadores PEM corretos.");
      console.log("[test-docusign-auth] Início da chave formatada:", rsaPrivateKeyFormatted.substring(0, 100));
      console.log("[test-docusign-auth] Fim da chave formatada:", rsaPrivateKeyFormatted.substring(rsaPrivateKeyFormatted.length - 100));
      throw new Error("Formato inválido da chave privada RSA após limpeza. Delimitadores PEM ausentes ou incorretos.");
  }
  // Remove qualquer coisa antes de "-----BEGIN..." e depois de "...END-----"
  const startIndex = rsaPrivateKeyFormatted.indexOf(beginsWith);
  const endIndex = rsaPrivateKeyFormatted.lastIndexOf(endsWith) + endsWith.length;
  rsaPrivateKeyFormatted = rsaPrivateKeyFormatted.substring(startIndex, endIndex);


  console.log("[test-docusign-auth] ----- INÍCIO CHAVE PRIVADA APÓS LIMPEZA DETALHADA -----");
  // Log com cuidado, talvez apenas alguns caracteres para confirmar o formato final
  // console.log(rsaPrivateKeyFormatted); // Descomente com cautela para depuração total da string
  console.log("Primeiros 70 chars da chave formatada:", rsaPrivateKeyFormatted.substring(0,70));
  console.log("Últimos 70 chars da chave formatada:", rsaPrivateKeyFormatted.substring(rsaPrivateKeyFormatted.length - 70));
  console.log("[test-docusign-auth] ----- FIM CHAVE PRIVADA APÓS LIMPEZA DETALHADA -----");

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log(`[test-docusign-auth] Tentando autenticação JWT para User ID: ${userId} na IK: ${ik}`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'], // Escopos padrão
      Buffer.from(rsaPrivateKeyFormatted), // Usa a chave após todas as limpezas
      3600 // Expiração do token em segundos
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
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

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido. Use GET." };
  }

  console.log("[test-docusign-auth] Função de teste de autenticação Docusign iniciada.");

  try {
    const apiClient = await getAuthenticatedApiClient();
    const usersApi = new docusign.UsersApi(apiClient);
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID; // Já verificado em getAuthenticatedApiClient

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