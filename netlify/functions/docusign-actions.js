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

  // Removendo logs excessivos daqui, pois a autenticação está funcionando
  if (!ik || !userId || !rsaPrivateKeyBase64Encoded || !authServer || !basePath || !accountId) {
    throw new Error("Variáveis de ambiente Docusign para autenticação incompletas.");
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
    // Logging de erro detalhado para autenticação
    console.error("[docusign-actions] FALHA NA AUTENTICAÇÃO JWT (getAuthenticatedApiClient):");
    console.error("Mensagem:", err.message);
    if (err.response) {
        console.error("Status da Resposta:", err.response.status);
        console.error("Dados da Resposta:", JSON.stringify(err.response.data || err.response.body, null, 2));
    } else {
        console.error("Objeto de erro completo (sem err.response):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
    throw new Error(`Erro de autenticação Docusign: ${err.message}`);
  }
}

// --- Função logErrorDetails (nova função auxiliar para logging de erro) ---
function logErrorDetails(actionName, errorObject) {
    console.error(`--------------------------------------------------------------------`);
    console.error(`[docusign-actions] ERRO NA AÇÃO: ${actionName}`);
    console.error(`--------------------------------------------------------------------`);
    console.error("Mensagem Principal:", errorObject.message);
    if (errorObject.code) console.error("Código (Axios/Node):", errorObject.code);

    let docusignSpecificError = "Detalhes específicos do Docusign não encontrados no corpo da resposta.";
    if (errorObject.response) {
        console.error("Status da Resposta Docusign:", errorObject.response.status);
        const errorBody = errorObject.response.data || errorObject.response.body;
        if (errorBody) {
            console.error("Corpo da Resposta de Erro Docusign:", JSON.stringify(errorBody, null, 2));
            if (typeof errorBody === 'object' && errorBody !== null) {
                docusignSpecificError = errorBody.message || errorBody.error_description || errorBody.error || JSON.stringify(errorBody);
                if (errorBody.errorDetails && Array.isArray(errorBody.errorDetails) && errorBody.errorDetails.length > 0) {
                    const detailsMessages = errorBody.errorDetails.map(detail => detail.message).join('; ');
                    docusignSpecificError += ` | Detalhes Adicionais: ${detailsMessages}`;
                }
            } else if (typeof errorBody === 'string') {
                docusignSpecificError = errorBody;
            }
        } else {
            console.error("Corpo da resposta de erro não encontrado em err.response.data nem em err.response.body.");
        }
    } else {
        console.log("[docusign-actions] Objeto 'err' não contém 'err.response'. Logando err completo para depuração:");
        console.error(JSON.stringify(errorObject, Object.getOwnPropertyNames(errorObject), 2));
    }
    return docusignSpecificError;
}


// --- Função para Criar Envelope usando Template ---
async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  // ... (definição do envelope como antes) ...
  let env = new docusign.EnvelopeDefinition();
  env.templateId = envelopeArgs.templateId;
  let signer = docusign.TemplateRole.constructFromObject({
    email: envelopeArgs.signerEmail, name: envelopeArgs.signerName,
    roleName: envelopeArgs.roleName || 'signer', clientUserId: envelopeArgs.signerClientUserId,
  });
  env.templateRoles = [signer];
  env.status = "sent";
  console.log("[docusign-actions] Criando envelope (template). Definição:", JSON.stringify(env, null, 2));
  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    return results.envelopeId;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createEnvelopeForEmbeddedSigning (template)", err);
    throw new Error(`Erro ao criar envelope (template). Docusign: ${docusignErrorMessage}`);
  }
}

// --- Função para Criar Envelope Dinâmico ---
async function createDynamicEnvelope(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  // ... (definição do envelope como antes) ...
  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = envelopeArgs.emailSubject || "Por favor, assine este documento";
  env.emailBlurb = envelopeArgs.emailBlurb || "Obrigado por usar Docusign com Fontara Financial.";
  if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) { /* ... */ }
  env.documents = envelopeArgs.documents.map(doc => docusign.Document.constructFromObject({ /* ... */ }));
  if (!envelopeArgs.recipients || !envelopeArgs.recipients.signers || !Array.isArray(envelopeArgs.recipients.signers) || envelopeArgs.recipients.signers.length === 0) { /* ... */ }
  env.recipients = docusign.Recipients.constructFromObject({
    signers: envelopeArgs.recipients.signers.map(s => { /* ... (lógica do signer e tabs como antes) ... */ 
        if (!s.email || !s.name || !s.recipientId || !s.clientUserId || !s.tabs) {
             throw new Error(`Signatário com recipientId '${s.recipientId || "DESCONHECIDO"}' tem dados faltando.`);
        }
        let signerObj = docusign.Signer.constructFromObject({
            email: s.email, name: s.name, recipientId: String(s.recipientId),
            routingOrder: String(s.routingOrder || "1"), clientUserId: s.clientUserId,
        });
        let sdkTabs = {};
        if (s.tabs.signHereTabs) sdkTabs.signHereTabs = s.tabs.signHereTabs.map(t => docusign.SignHere.constructFromObject(t));
        if (s.tabs.dateSignedTabs) sdkTabs.dateSignedTabs = s.tabs.dateSignedTabs.map(t => docusign.DateSigned.constructFromObject(t));
        if (s.tabs.fullNameTabs) sdkTabs.fullNameTabs = s.tabs.fullNameTabs.map(t => docusign.FullName.constructFromObject(t));
        signerObj.tabs = docusign.Tabs.constructFromObject(sdkTabs);
        return signerObj;
    }),
    carbonCopies: (envelopeArgs.recipients.carbonCopies || []).map(cc => docusign.CarbonCopy.constructFromObject({ /* ... */ }))
  });
  env.status = envelopeArgs.status || "sent";
  console.log("[docusign-actions] Criando envelope dinâmico. Definição (sem base64):", JSON.stringify({ ...env, documents: env.documents.map(d => ({...d, documentBase64: "REMOVIDO_DO_LOG"})) }, null, 2));
  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    return results.envelopeId;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createDynamicEnvelope", err); // Usa a nova função de log
    throw new Error(`Erro ao criar envelope dinâmico. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Função para Criar Recipient View ---
async function createRecipientView(apiClient, args) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  // ... (definição do viewRequest como antes) ...
  const viewRequest = docusign.RecipientViewRequest.constructFromObject({ /* ... */ });
  console.log("[docusign-actions] Criando recipient view. Payload:", JSON.stringify(viewRequest, null, 2));
  try {
    const results = await envelopesApi.createRecipientView(accountId, args.envelopeId, { recipientViewRequest: viewRequest });
    return results.url;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createRecipientView", err); // Usa a nova função de log
    throw new Error(`Erro ao gerar URL de assinatura. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Handler Principal (sem grandes mudanças aqui, apenas o catch pode ser mais simples) ---
exports.handler = async (event, context) => {
  // ... (validação do método POST e parse do body como antes) ...
  let action, payload;
  try { /* ... parse do body ... */ } catch (e) { /* ... */ }
  if (!action) { /* ... */ }

  console.log(`[docusign-actions] Ação recebida: ${action}`);
  
  try {
    const apiClient = await getAuthenticatedApiClient(); // Autenticação primeiro
    let resultBody;

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE_FROM_TEMPLATE":
        // ... (validação do payload) ...
        const templateEnvelopeId = await createEnvelopeForEmbeddedSigning(apiClient, payload);
        resultBody = JSON.stringify({ envelopeId: templateEnvelopeId });
        break;
      case "CREATE_DYNAMIC_EMBEDDED_ENVELOPE":
        // ... (validação do payload) ...
        const dynamicEnvelopeId = await createDynamicEnvelope(apiClient, payload);
        resultBody = JSON.stringify({ envelopeId: dynamicEnvelopeId });
        break;
      case "GET_EMBEDDED_SIGNING_URL":
        // ... (validação do payload) ...
        const signingUrl = await createRecipientView(apiClient, payload);
        resultBody = JSON.stringify({ signingUrl: signingUrl });
        break;
      default:
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }
    return { statusCode: 200, body: resultBody };

  } catch (error) {
    // O erro já foi logado em detalhes pelas funções internas
    console.error(`[docusign-actions] Erro final no handler para ação '${action}':`, error.message);
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            error: "Erro ao processar requisição Docusign.",
            details: error.message // A mensagem de erro já foi construída com detalhes do Docusign
        }) 
    };
  }
};