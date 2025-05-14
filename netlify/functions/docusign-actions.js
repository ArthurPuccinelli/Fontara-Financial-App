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
    // console.log(`[docusign-actions] Tentando autenticação JWT para User ID: ${userId.substring(0,5)}... na IK: ${ik.substring(0,5)}...`); // Log já confirmado
    const results = await apiClient.requestJWTUserToken(ik, userId, ['signature', 'impersonation'], Buffer.from(rsaPrivateKeyPemString), 3600);
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[docusign-actions] Token de acesso Docusign obtido com sucesso para a ação.");
    return apiClient;
  } catch (err) {
    console.error("[docusign-actions] FALHA NA AUTENTICAÇÃO JWT (getAuthenticatedApiClient):");
    console.error("Mensagem:", err.message);
    if (err.response) {
        console.error("Status da Resposta:", err.response.status);
        console.error("Dados da Resposta:", JSON.stringify(err.response.data || err.response.body, null, 2));
    } else {
        console.error("Objeto de erro completo (sem err.response):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
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

function logErrorDetails(actionName, errorObject) { /* ... (Mantenha esta função como na resposta anterior) ... */ 
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

async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) { /* ... (como antes) ... */ 
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
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
async function createDynamicEnvelope(apiClient, envelopeArgs) { /* ... (como antes, com logs e validações) ... */ 
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = envelopeArgs.emailSubject || "Por favor, assine este documento";
  env.emailBlurb = envelopeArgs.emailBlurb || "Obrigado por usar Docusign com Fontara Financial.";
  if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) { throw new Error("Nenhum documento.");}
  env.documents = envelopeArgs.documents.map(doc => docusign.Document.constructFromObject({documentBase64: doc.documentBase64,name: doc.name,fileExtension: doc.fileExtension,documentId: doc.documentId}));
  if (!envelopeArgs.recipients || !envelopeArgs.recipients.signers || !Array.isArray(envelopeArgs.recipients.signers) || envelopeArgs.recipients.signers.length === 0) {throw new Error("Nenhum signatário.");}
  env.recipients = docusign.Recipients.constructFromObject({
    signers: envelopeArgs.recipients.signers.map(s => {
        if (!s.email || !s.name || !s.recipientId || !s.clientUserId || !s.tabs) {throw new Error(`Signatário ${s.recipientId || "DESCONHECIDO"} incompleto.`);}
        let signerObj = docusign.Signer.constructFromObject({email: s.email, name: s.name, recipientId: String(s.recipientId),routingOrder: String(s.routingOrder || "1"), clientUserId: s.clientUserId});
        let sdkTabs = {};
        if (s.tabs.signHereTabs) sdkTabs.signHereTabs = s.tabs.signHereTabs.map(t => docusign.SignHere.constructFromObject(t));
        if (s.tabs.dateSignedTabs) sdkTabs.dateSignedTabs = s.tabs.dateSignedTabs.map(t => docusign.DateSigned.constructFromObject(t));
        if (s.tabs.fullNameTabs) sdkTabs.fullNameTabs = s.tabs.fullNameTabs.map(t => docusign.FullName.constructFromObject(t));
        signerObj.tabs = docusign.Tabs.constructFromObject(sdkTabs);
        return signerObj;
    }),
    carbonCopies: (envelopeArgs.recipients.carbonCopies || []).map(cc => docusign.CarbonCopy.constructFromObject({email: cc.email, name: cc.name, recipientId: String(cc.recipientId), routingOrder: String(cc.routingOrder || (envelopeArgs.recipients.signers.length + 1))}))
  });
  env.status = envelopeArgs.status || "sent";
  console.log("[docusign-actions] Criando envelope dinâmico. Definição (sem base64):", JSON.stringify({ ...env, documents: env.documents.map(d => ({...d, documentBase64: "REMOVIDO_DO_LOG"})) }, null, 2));
  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("[docusign-actions] Envelope dinâmico criado. ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createDynamicEnvelope", err);
    throw new Error(`Erro ao criar envelope dinâmico. Docusign: ${docusignErrorMessage}`);
  }
}
async function createRecipientView(apiClient, args) { /* ... (como antes) ... */ 
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const viewRequest = docusign.RecipientViewRequest.constructFromObject({returnUrl: args.returnUrl,authenticationMethod: 'none', email: args.signerEmail,userName: args.signerName,clientUserId: args.signerClientUserId});
  console.log("[docusign-actions] Criando recipient view. Payload:", JSON.stringify(viewRequest, null, 2));
  try {
    const results = await envelopesApi.createRecipientView(accountId, args.envelopeId, {recipientViewRequest: viewRequest});
    return results.url;
  } catch (err) {
    const docusignErrorMessage = logErrorDetails("createRecipientView", err);
    throw new Error(`Erro ao gerar URL de assinatura. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Handler Principal da Netlify Function (ATUALIZADO PARA DEBUG DO BODY) ---
exports.handler = async (event, context) => {
  // Verifica se o método é POST
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  let action, payload;
  let requestBodyForParsing;

  console.log("[docusign-actions] ------ INÍCIO DA REQUISIÇÃO ------");
  console.log("[docusign-actions] Cabeçalhos recebidos:", JSON.stringify(event.headers, null, 2));
  console.log("[docusign-actions] event.isBase64Encoded:", event.isBase64Encoded);
  console.log("[docusign-actions] Tipo do event.body:", typeof event.body);
  // Loga uma prévia do corpo para evitar logar dados sensíveis completos se for muito grande
  if (typeof event.body === 'string') {
    console.log("[docusign-actions] Preview do event.body (string):", event.body.substring(0, 250) + (event.body.length > 250 ? "..." : ""));
  } else {
    console.log("[docusign-actions] event.body (não é string):", event.body);
  }


  try {
    if (event.isBase64Encoded && typeof event.body === 'string') {
      requestBodyForParsing = Buffer.from(event.body, 'base64').toString('utf-8');
      console.log("[docusign-actions] Corpo decodificado de Base64 para parse:", requestBodyForParsing.substring(0, 250) + "...");
    } else if (typeof event.body === 'string') {
      requestBodyForParsing = event.body;
    } else if (typeof event.body === 'object' && event.body !== null) {
      // Se já for um objeto, o API Gateway/Netlify pode ter feito o parse
      // Mas para consistência, vamos stringify e parse novamente, ou usar diretamente.
      // Para este caso, se já é objeto, vamos assumir que está correto.
      action = event.body.action;
      payload = event.body.payload;
      console.log("[docusign-actions] event.body já é um objeto. Action:", action, "Payload presente?", !!payload);
    } else {
      throw new Error("Corpo da requisição está vazio, nulo ou em formato inesperado.");
    }

    if (typeof requestBodyForParsing === 'string') { // Só faz parse se for string
        const parsedBody = JSON.parse(requestBodyForParsing);
        action = parsedBody.action;
        payload = parsedBody.payload;
        console.log("[docusign-actions] Corpo parseado de string. Action:", action, "Payload presente?", !!payload);
    }

  } catch (e) {
    console.error("[docusign-actions] Erro crítico ao processar/parsear corpo da requisição:", e.message);
    console.error("Stack do erro de parsing:", e.stack);
    console.error("event.body original que causou o erro de parsing:", event.body); // Loga o corpo problemático
    return { statusCode: 400, body: JSON.stringify({error: "Requisição mal formatada ou corpo JSON inválido.", details: e.message }) };
  }

  if (!action) {
    console.error("[docusign-actions] 'action' não especificada ou não encontrada no corpo da requisição após o parse.");
    return { statusCode: 400, body: JSON.stringify({error: "Ação não especificada."}) };
  }

  console.log(`[docusign-actions] Ação recebida (confirmada): ${action}`);
  
  try {
    const apiClient = await getAuthenticatedApiClient(); // Autenticação primeiro
    let resultBody;

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE_FROM_TEMPLATE":
        if (!payload || !payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
          throw new Error("Dados insuficientes para criar envelope de template.");
        }
        const templateEnvelopeId = await createEnvelopeForEmbeddedSigning(apiClient, payload);
        resultBody = JSON.stringify({ envelopeId: templateEnvelopeId });
        break;
      case "CREATE_DYNAMIC_EMBEDDED_ENVELOPE":
        if (!payload || !payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
          throw new Error("Dados insuficientes para criar envelope dinâmico.");
        }
        for (const signer of payload.recipients.signers) {
            if (!signer.email || !signer.name || !signer.recipientId || !signer.clientUserId || !signer.tabs) {
                 throw new Error(`Signatário com recipientId '${signer.recipientId || "DESCONHECIDO"}' tem dados faltando.`);
            }
        }
        const dynamicEnvelopeId = await createDynamicEnvelope(apiClient, payload);
        resultBody = JSON.stringify({ envelopeId: dynamicEnvelopeId });
        break;
      case "GET_EMBEDDED_SIGNING_URL":
        if (!payload || !payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId || !payload.returnUrl) {
          throw new Error("Dados insuficientes para gerar URL de assinatura.");
        }
        const signingUrl = await createRecipientView(apiClient, payload);
        resultBody = JSON.stringify({ signingUrl: signingUrl });
        break;
      default:
        console.warn(`[docusign-actions] Ação desconhecida recebida: ${action}`);
        return { statusCode: 400, body: JSON.stringify({error: `Ação desconhecida: ${action}`}) };
    }
    console.log(`[docusign-actions] Ação ${action} processada com sucesso.`);
    return { statusCode: 200, body: resultBody };

  } catch (error) {
    // O erro já deve ter sido logado em detalhes pelas funções internas ou pelo bloco de parse do body
    console.error(`[docusign-actions] ERRO FINAL NO HANDLER para ação '${action}':`, error.message);
    // Não logar o stack aqui se já foi logado, para evitar redundância
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            error: "Erro ao processar requisição Docusign.",
            details: error.message 
        }) 
    };
  }
};