// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');

// --- Função getAuthenticatedApiClient (MANTENHA A VERSÃO QUE FUNCIONOU PARA AUTENTICAÇÃO) ---
async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64; 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer || !basePath || !accountId) {
    const missingVars = ['DOCUSIGN_IK', 'DOCUSIGN_USER_ID', 'DOCUSIGN_ACCOUNT_ID', 'DOCUSIGN_RSA_PEM_AS_BASE64', 'DOCUSIGN_AUTH_SERVER', 'DOCUSIGN_BASE_PATH']
        .filter(v => !process.env[v]);
    const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
    console.error(`[docusign-actions] ${errorMessage}`);
    throw new Error(errorMessage);
  }
  let rsaPrivateKeyPemString;
  try {
    rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8').trim();
    if (!rsaPrivateKeyPemString.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPemString.endsWith("-----END RSA PRIVATE KEY-----")) {
      throw new Error("Chave privada PEM decodificada de Base64 está inválida (delimitadores).");
    }
  } catch (e) {
    console.error("[docusign-actions] ERRO AO DECODIFICAR/VALIDAR A CHAVE PRIVADA BASE64:", e.message);
    throw new Error("Falha ao decodificar/validar a chave privada: " + e.message);
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);
  try {
    const results = await apiClient.requestJWTUserToken(ik, userId, ['signature', 'impersonation'], Buffer.from(rsaPrivateKeyPemString), 3600);
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[docusign-actions] Token de acesso Docusign obtido com sucesso para a ação.");
    return apiClient;
  } catch (err) {
    console.error("[docusign-actions] FALHA NA AUTENTICAÇÃO JWT (getAuthenticatedApiClient):");
    // ... (logging de erro detalhado como antes) ...
    let detailedErrorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && (err.response.data || err.response.body)) {
        let errorBody = err.response.data || err.response.body;
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
        const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        detailedErrorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
    } else if (err.message) { detailedErrorMessage += ` Detalhe: ${err.message}`; }
    throw new Error(detailedErrorMessage);
  }
}

function logErrorDetails(actionName, errorObject) { /* ... (Mantenha esta função como antes) ... */ }
async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) { /* ... (Mantenha esta função como antes) ... */ }
async function createDynamicEnvelope(apiClient, envelopeArgs) { /* ... (Mantenha esta função como antes, com transformPdfFields: "false") ... */ }

// --- Função para Criar Recipient View (ATUALIZADA) ---
async function createRecipientView(apiClient, args) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  let viewRequestOptions = {
    returnUrl: args.returnUrl,
    authenticationMethod: 'none', 
    email: args.signerEmail,
    userName: args.signerName,
    clientUserId: args.signerClientUserId,
    // pingFrequency: '600', 
    // pingUrl: 'SUA_URL_DE_PING_SE_NECESSARIO', 
  };

  // Adiciona controle do chrome para "Visualização Focada"
  if (args.useFocusedView === true) {
    viewRequestOptions.chromeControls = 'hide'; // Esconde a maior parte da UI do Docusign
    // Para uma experiência ainda mais focada, você pode testar outras opções ou combinações
    // como settings para frameAncestors ou messageOrigins se a SDK ou API permitir diretamente
    // no RecipientViewRequest. 'hide' é o mais direto para remover o chrome.
  } else {
    viewRequestOptions.chromeControls = 'show'; // Comportamento padrão
  }

  const viewRequest = docusign.RecipientViewRequest.constructFromObject(viewRequestOptions);

  console.log("[docusign-actions] Criando recipient view. Payload:", JSON.stringify(viewRequest, null, 2));
  try {
    const results = await envelopesApi.createRecipientView(accountId, args.envelopeId, {
      recipientViewRequest: viewRequest,
    });
    console.log("[docusign-actions] URL de assinatura embutida gerada com sucesso.");
    return results.url;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createRecipientView", err); 
    throw new Error(`Erro ao gerar URL de assinatura. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Handler Principal da Netlify Function (ATUALIZADO para passar useFocusedView) ---
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") { /* ... */ }
  let action, payload;
  try { /* ... parse do body ... */ 
    let requestBody;
    if (typeof event.body === "string") { requestBody = JSON.parse(event.body); } 
    else if (typeof event.body === "object" && event.body !== null) { requestBody = event.body; } 
    else { throw new Error("Corpo da requisição vazio ou em formato inesperado."); }
    action = requestBody.action;
    payload = requestBody.payload;
  } catch (e) { /* ... */ }
  if (!action) { /* ... */ }

  console.log(`[docusign-actions] Ação recebida: ${action}`);
  
  try {
    const apiClient = await getAuthenticatedApiClient();
    let resultBody;

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE_FROM_TEMPLATE":
        // ... (como antes) ...
        break;
      case "CREATE_DYNAMIC_EMBEDDED_ENVELOPE":
        // ... (como antes) ...
        break;
      case "GET_EMBEDDED_SIGNING_URL":
        // Payload agora pode incluir useFocusedView
        if (!payload || !payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.clientUserId || !payload.returnUrl) {
          throw new Error("Dados insuficientes para gerar URL de assinatura.");
        }
        // payload.useFocusedView será true ou false (ou undefined se não enviado)
        const signingUrl = await createRecipientView(apiClient, payload);
        resultBody = JSON.stringify({ signingUrl: signingUrl });
        break;
      default:
        return { statusCode: 400, body: JSON.stringify({error: `Ação desconhecida: ${action}`}) };
    }
    console.log(`[docusign-actions] Ação ${action} processada com sucesso.`);
    return { statusCode: 200, body: resultBody };

  } catch (error) {
    // ... (tratamento de erro final como antes) ...
  }
};
