// netlify/functions/test-docusign-auth.js
const docusign = require('docusign-esign');
const fetch = require('node-fetch'); // Necessário para a chamada /oauth/userinfo

async function getAuthenticatedApiClientAndToken() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64; 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  console.log("[test-docusign-auth] ---- Variáveis de Ambiente Lidas ----");
  console.log("[test-docusign-auth] DOCUSIGN_IK:", ik ? ik.substring(0,5) + "..." : "AUSENTE!"); // Log parcial por segurança
  console.log("[test-docusign-auth] DOCUSIGN_USER_ID:", userId ? userId.substring(0,5) + "..." : "AUSENTE!"); // Log parcial
  console.log("[test-docusign-auth] DOCUSIGN_ACCOUNT_ID:", accountId ? accountId.substring(0,5) + "..." : "AUSENTE!"); // Log parcial
  console.log("[test-docusign-auth] DOCUSIGN_AUTH_SERVER:", authServer || "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_BASE_PATH:", basePath || "AUSENTE!");
  console.log("[test-docusign-auth] DOCUSIGN_RSA_PEM_AS_BASE64 presente?", !!rsaPrivateKeyBase64Encoded);
  console.log("[test-docusign-auth] -----------------------------------------");

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer || !basePath || !accountId) {
    const missingVars = ['DOCUSIGN_IK', 'DOCUSIGN_USER_ID', 'DOCUSIGN_ACCOUNT_ID', 'DOCUSIGN_RSA_PEM_AS_BASE64', 'DOCUSIGN_AUTH_SERVER', 'DOCUSIGN_BASE_PATH']
        .filter(v => !process.env[v]);
    const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
    console.error(`[test-docusign-auth] ${errorMessage}`);
    throw new Error(errorMessage);
  }

  let rsaPrivateKeyPemString;
  try {
    rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8').trim();
  } catch (e) {
    console.error("[test-docusign-auth] ERRO AO DECODIFICAR A CHAVE PRIVADA DA STRING BASE64:", e);
    throw new Error("Falha ao decodificar a chave privada armazenada em Base64. Verifique o valor da variável de ambiente DOCUSIGN_RSA_PEM_AS_BASE64. " + e.message);
  }

  console.log("[test-docusign-auth] ----- INÍCIO CHAVE PEM DECODIFICADA DE BASE64 (Verificação) -----");
  console.log("Primeiros 70 chars da chave PEM decodificada:", rsaPrivateKeyPemString.substring(0, 70));
  console.log("Últimos 70 chars da chave PEM decodificada:", rsaPrivateKeyPemString.substring(rsaPrivateKeyPemString.length - 70));
  
  const beginsWith = "-----BEGIN RSA PRIVATE KEY-----";
  const endsWith = "-----END RSA PRIVATE KEY-----";
  if (!rsaPrivateKeyPemString.startsWith(beginsWith) || !rsaPrivateKeyPemString.endsWith(endsWith)) {
      console.error("[test-docusign-auth] ERRO CRÍTICO: Chave PEM decodificada de Base64 está mal formatada ou incompleta (delimitadores PEM ausentes/incorretos).");
      console.error("Conteúdo decodificado (início):", rsaPrivateKeyPemString.substring(0,100));
      console.error("Conteúdo decodificado (fim):", rsaPrivateKeyPemString.substring(rsaPrivateKeyPemString.length - 100));
      throw new Error("Chave privada PEM decodificada de Base64 está inválida. Verifique se a string Base64 original foi gerada corretamente a partir de um arquivo PEM válido e completo, e se os delimitadores estão presentes após a decodificação.");
  }
  console.log("[test-docusign-auth] ----- FIM CHAVE PEM DECODIFICADA DE BASE64 (Verificação OK) -----");

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  let accessToken;
  try {
    console.log(`[test-docusign-auth] Tentando autenticação JWT para User ID: ${userId} na IK: ${ik.substring(0,5)}... via ${authServer} com escopos: signature impersonation user_read`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation', 'user_read'], // Escopos para JWT e para /oauth/userinfo
      Buffer.from(rsaPrivateKeyPemString), 
      3600
    );
    accessToken = results.body.access_token;
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + accessToken);
    console.log("[test-docusign-auth] Token de acesso Docusign obtido com sucesso.");
    return { apiClient, accessToken, authServerHost: authServer, docusignAccountIdFromEnv: accountId };
  } catch (err) {
    console.error("--------------------------------------------------------------------");
    console.error("[test-docusign-auth] ERRO AO OBTER TOKEN DE ACESSO DOCUSIGN (requestJWTUserToken)");
    console.error("--------------------------------------------------------------------");
    console.error("Mensagem de Erro Principal (err.message):", err.message);
    if (err.code) {
      console.error("Código de Erro (Axios/Node):", err.code);
    }

    let detailedErrorMessage = "Erro ao autenticar com Docusign.";

    if (err.response) {
      console.error("--- Detalhes da Resposta de Erro do Docusign (err.response) ---");
      console.error("Status da Resposta:", err.response.status);
      // console.error("Cabeçalhos da Resposta:", JSON.stringify(err.response.headers, null, 2)); // Pode ser muito verboso
      console.error("Corpo da Resposta (err.response.data ou err.response.body):");
      
      let errorBody = err.response.data || err.response.body; // Axios usa err.response.data
      if (errorBody) {
        if (typeof errorBody === 'string') {
          try { errorBody = JSON.parse(errorBody); } catch (e) { console.log("Corpo do erro não é JSON, exibindo como string."); }
        }
        console.error(JSON.stringify(errorBody, null, 2));
        const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        detailedErrorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
      } else {
        console.error("Corpo da resposta de erro não encontrado em err.response.data ou err.response.body.");
        detailedErrorMessage += " Docusign não retornou corpo de erro detalhado na resposta."
      }
      console.error("---------------------------------------------------------------");
    } else {
        console.log("[test-docusign-auth] Objeto 'err' não contém 'err.response'. Logando err completo:")
        console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
    
    throw new Error(detailedErrorMessage);
  }
}

exports.handler = async (event, context) => {
  if (event.httpMethod !== "GET") {
    return { statusCode: 405, body: "Método não permitido. Use GET." };
  }
  console.log("[test-docusign-auth] Função de teste de autenticação Docusign iniciada.");

  try {
    const { apiClient, accessToken, authServerHost, docusignAccountIdFromEnv } = await getAuthenticatedApiClientAndToken();
    
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
    console.log("[test-docusign-auth] Informações do /oauth/userinfo obtidas com sucesso.");
    // console.log(JSON.stringify(userInfo, null, 2)); // Descomente para ver o objeto userInfo completo

    let accountDetailsForResponse = null;
    if (userInfo.accounts && Array.isArray(userInfo.accounts)) {
        const targetAccount = userInfo.accounts.find(acc => acc.account_id === docusignAccountIdFromEnv);
        if (targetAccount) {
            console.log("[test-docusign-auth] Detalhes da conta alvo encontrados via /oauth/userinfo:", targetAccount);
            accountDetailsForResponse = {
                accountId: targetAccount.account_id,
                accountName: targetAccount.account_name,
                baseUri: targetAccount.base_uri // Este é o basePath correto para chamadas API para esta conta!
            };
            // Você pode querer comparar targetAccount.base_uri com process.env.DOCUSIGN_BASE_PATH
            if (targetAccount.base_uri && process.env.DOCUSIGN_BASE_PATH && !process.env.DOCUSIGN_BASE_PATH.includes(targetAccount.base_uri.split('/restapi')[0])) {
                console.warn(`[test-docusign-auth] ATENÇÃO: O DOCUSIGN_BASE_PATH (${process.env.DOCUSIGN_BASE_PATH}) pode não corresponder ao base_uri da conta principal retornado pelo userinfo (${targetAccount.base_uri}). Use o base_uri da conta para chamadas API.`);
            }
        } else {
            console.warn(`[test-docusign-auth] A conta DOCUSIGN_ACCOUNT_ID (${docusignAccountIdFromEnv}) não foi encontrada na lista de contas do usuário do /oauth/userinfo. Verifique se o User ID tem acesso a esta Account ID.`);
        }
    } else {
        console.warn("[test-docusign-auth] Nenhuma conta encontrada nos detalhes do /oauth/userinfo.");
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Autenticação Docusign (JWT) e chamada /oauth/userinfo BEM-SUCEDIDAS!",
        retrievedUserInfo: { // Campos selecionados do userInfo para evitar logar tudo
            sub: userInfo.sub,
            name: userInfo.name,
            given_name: userInfo.given_name,
            family_name: userInfo.family_name,
            email: userInfo.email,
        },
        accountDetailsForTargetAccount: accountDetailsForResponse
      }),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (error) {
    console.error("[test-docusign-auth] ERRO DURANTE O TESTE:", error.message);
    if(error.stack && !error.message.includes(error.stack.split('\n')[0])) { // Evita duplicar a mensagem se já estiver no stack
        console.error("[test-docusign-auth] Stack do Erro:", error.stack);
    }
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