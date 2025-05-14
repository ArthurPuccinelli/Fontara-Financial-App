// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');
const fetch = require('node-fetch'); // Precisaremos de fetch para chamar /oauth/userinfo

async function getAuthenticatedApiClientAndToken() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64; 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER; // ex: account-d.docusign.com
  const basePath = process.env.DOCUSIGN_BASE_PATH;     // ex: https://demo.docusign.net/restapi
  
  // ... (logs e verificações das variáveis de ambiente como antes) ...
  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer || !basePath ) {
    throw new Error("Variáveis de ambiente Docusign para autenticação incompletas.");
  }

  let rsaPrivateKeyPemString;
  try {
    rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8').trim();
    if (!rsaPrivateKeyPemString.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPemString.endsWith("-----END RSA PRIVATE KEY-----")) {
      throw new Error("Chave privada PEM decodificada de Base64 está inválida (delimitadores).");
    }
  } catch (e) {
    console.error("[test-docusign-auth] ERRO AO DECODIFICAR/VALIDAR A CHAVE PRIVADA BASE64:", e);
    throw new Error("Falha ao decodificar/validar a chave privada: " + e.message);
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  let accessToken;
  try {
    console.log(`[test-docusign-auth] Tentando autenticação JWT.`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation', 'user_read'], // Adicionado user_read para /userinfo
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );
    accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return { apiClient, accessToken, authServerHost: authServer }; // Retorna também o token e o host do auth server
  } catch (err) {
    // ... (tratamento de erro como antes) ...
    console.error("[test-docusign-auth] Erro ao obter token de acesso Docusign:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    // ... (extrair mensagem de erro do Docusign) ...
    throw new Error(errorMessage);
  }
}

export const handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido. Use GET." };
  }
  console.log("[test-docusign-auth] Função de teste iniciada.");

  try {
    const { apiClient, accessToken, authServerHost } = await getAuthenticatedApiClientAndToken();
    
    // Teste 1: Chamar o endpoint /oauth/userinfo para obter dados do usuário autenticado
    console.log("[test-docusign-auth] Tentando chamar /oauth/userinfo...");
    const userInfoResponse = await fetch(`https://${authServerHost}/oauth/userinfo`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (!userInfoResponse.ok) {
      const errorText = await userInfoResponse.text();
      console.error(`[test-docusign-auth] Erro ao chamar /oauth/userinfo: ${userInfoResponse.status}`, errorText);
      throw new Error(`Falha ao obter userInfo do Docusign: ${userInfoResponse.status} - ${errorText}`);
    }
    
    const userInfo = await userInfoResponse.json();
    console.log("[test-docusign-auth] Informações do /oauth/userinfo obtidas com sucesso:", userInfo);

    // Teste 2 (Opcional, se o Teste 1 funcionar): Tentar listar contas novamente com UsersApi
    // Pode ser que o userInfo já traga o accountId que precisamos.
    let accountsInfo = null;
    const docusignAccountId = process.env.DOCUSIGN_ACCOUNT_ID;

    // O userInfo do /oauth/userinfo geralmente contém as contas do usuário.
    // Ex: userInfo.accounts é um array [{account_id: "...", is_default: true, account_name: "...", base_uri: "..."}]
    // Vamos tentar encontrar o accountId que você configurou na env var para confirmar.
    let accountDetailsFromUserInfo = null;
    if (userInfo.accounts && Array.isArray(userInfo.accounts)) {
        accountDetailsFromUserInfo = userInfo.accounts.find(acc => acc.account_id === docusignAccountId);
    }

    if (accountDetailsFromUserInfo) {
        console.log("[test-docusign-auth] Detalhes da conta encontrados via /oauth/userinfo:", accountDetailsFromUserInfo);
        accountsInfo = {
            accountId: accountDetailsFromUserInfo.account_id,
            accountName: accountDetailsFromUserInfo.account_name,
            baseUri: accountDetailsFromUserInfo.base_uri
        };
    } else {
        console.warn(`[test-docusign-auth] A conta especificada (${docusignAccountId}) não foi encontrada nos detalhes do /oauth/userinfo. Verifique o DOCUSIGN_ACCOUNT_ID.`);
        // Você ainda pode tentar a UsersApi se quiser, mas o /oauth/userinfo é mais fundamental.
    }


    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Autenticação Docusign (JWT) e chamada /oauth/userinfo BEM-SUCEDIDAS!",
        userInfoFromOAuth: userInfo,
        accountDetailsFound: accountsInfo
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("[test-docusign-auth] ERRO DURANTE O TESTE:", error.message);
    if(error.stack) console.error("[test-docusign-auth] Stack do Erro:", error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Falha no teste de autenticação/API Docusign.",
        error: error.message,
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};