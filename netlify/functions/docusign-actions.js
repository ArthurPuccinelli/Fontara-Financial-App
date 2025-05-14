// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign'); // Certifique-se de que está no package.json da raiz

// --- Função para obter o Cliente API Docusign Autenticado ---
async function getAuthenticatedApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  const rsaPrivateKeyBase64Encoded = process.env.DOCUSIGN_RSA_PEM_AS_BASE64; 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID; // Necessário para algumas verificações/logs

  // Log inicial para verificar se as variáveis de ambiente principais estão presentes
  console.log("[docusign-actions] Iniciando getAuthenticatedApiClient...");
  console.log("[docusign-actions] DOCUSIGN_IK presente:", !!ik);
  console.log("[docusign-actions] DOCUSIGN_USER_ID presente:", !!userId);
  console.log("[docusign-actions] DOCUSIGN_RSA_PEM_AS_BASE64 presente?", !!rsaPrivateKeyBase64Encoded);
  console.log("[docusign-actions] DOCUSIGN_AUTH_SERVER:", authServer);
  console.log("[docusign-actions] DOCUSIGN_BASE_PATH:", basePath);
  console.log("[docusign-actions] DOCUSIGN_ACCOUNT_ID presente:", !!accountId);


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
  } catch (e) {
    console.error("[docusign-actions] ERRO AO DECODIFICAR A CHAVE PRIVADA DA STRING BASE64:", e);
    throw new Error("Falha ao decodificar a chave privada (Base64). Verifique DOCUSIGN_RSA_PEM_AS_BASE64. " + e.message);
  }
  
  const beginsWith = "-----BEGIN RSA PRIVATE KEY-----";
  const endsWith = "-----END RSA PRIVATE KEY-----";
  if (!rsaPrivateKeyPemString.startsWith(beginsWith) || !rsaPrivateKeyPemString.endsWith(endsWith)) {
      console.error("[docusign-actions] ERRO CRÍTICO: Chave PEM decodificada de Base64 está mal formatada (delimitadores).");
      // Não logue a chave inteira aqui por segurança, mas verifique o formato no seu ambiente de dev se necessário.
      throw new Error("Chave privada PEM decodificada de Base64 está inválida (delimitadores incorretos).");
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log(`[docusign-actions] Tentando autenticação JWT para User ID: ${userId.substring(0,5)}... na IK: ${ik.substring(0,5)}...`);
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'], // Escopos básicos para criar e enviar envelopes
      Buffer.from(rsaPrivateKeyPemString),
      3600
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("[docusign-actions] Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("--------------------------------------------------------------------");
    console.error("[docusign-actions] ERRO AO OBTER TOKEN DE ACESSO DOCUSIGN (requestJWTUserToken)");
    console.error("--------------------------------------------------------------------");
    console.error("Mensagem de Erro Principal (err.message):", err.message);
    if (err.code) console.error("Código de Erro (Axios/Node):", err.code);
    
    let detailedErrorMessage = "Erro ao autenticar com Docusign.";
    if (err.response) {
      console.error("Status da Resposta Docusign:", err.response.status);
      let errorBody = err.response.data || err.response.body;
      if (errorBody) {
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
        console.error("Corpo da Resposta de Erro Docusign:", JSON.stringify(errorBody, null, 2));
        const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        detailedErrorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
      } else { detailedErrorMessage += " Docusign não retornou corpo de erro detalhado."; }
    } else {
      console.log("[docusign-actions] Objeto 'err' não contém 'err.response'. Logando err completo:");
      console.error(JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    }
    throw new Error(detailedErrorMessage);
  }
}

// --- Função para Criar Envelope usando Template ---
async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  let env = new docusign.EnvelopeDefinition();
  env.templateId = envelopeArgs.templateId;

  let signer = docusign.TemplateRole.constructFromObject({
    email: envelopeArgs.signerEmail,
    name: envelopeArgs.signerName,
    roleName: envelopeArgs.roleName || 'signer', // Certifique-se que este papel existe no template
    clientUserId: envelopeArgs.signerClientUserId,
  });
  
  env.templateRoles = [signer];
  env.status = "sent";

  console.log("[docusign-actions] Criando envelope a partir de template. Definição:", JSON.stringify(env, null, 2));
  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("[docusign-actions] Envelope (template) criado com sucesso. ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    console.error("[docusign-actions] Erro ao criar envelope (template):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    // Tenta extrair mensagem específica do Docusign
    let errorBody = err.response && (err.response.data || err.response.body);
    let docusignErrorMessage = "Erro desconhecido do Docusign.";
    if (errorBody) {
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
        docusignErrorMessage = errorBody.message || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        if (errorBody.errorDetails && errorBody.errorDetails.message) docusignErrorMessage += ` (${errorBody.errorDetails.message})`;
    } else if (err.message) {
        docusignErrorMessage = err.message;
    }
    throw new Error(`Erro ao criar envelope (template). Docusign: ${docusignErrorMessage}`);
  }
}

// --- Função para Criar Envelope Dinâmico (sem template) ---
async function createDynamicEnvelope(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = envelopeArgs.emailSubject || "Por favor, assine este documento";
  env.emailBlurb = envelopeArgs.emailBlurb || "Obrigado por usar Docusign com Fontara Financial.";

  if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) {
    throw new Error("Nenhum documento fornecido para o envelope dinâmico.");
  }
  env.documents = envelopeArgs.documents.map(doc => 
    docusign.Document.constructFromObject({
      documentBase64: doc.documentBase64,
      name: doc.name,
      fileExtension: doc.fileExtension,
      documentId: doc.documentId
    })
  );

  if (!envelopeArgs.recipients || !envelopeArgs.recipients.signers || !Array.isArray(envelopeArgs.recipients.signers) || envelopeArgs.recipients.signers.length === 0) {
    throw new Error("Nenhum signatário fornecido para o envelope dinâmico.");
  }

  env.recipients = docusign.Recipients.constructFromObject({
    signers: envelopeArgs.recipients.signers.map(s => {
      if (!s.email || !s.name || !s.recipientId || !s.clientUserId || !s.tabs) {
          throw new Error(`Signatário com recipientId '${s.recipientId || "DESCONHECIDO"}' tem dados faltando (email, nome, recipientId, clientUserId, tabs).`);
      }
      let signer = docusign.Signer.constructFromObject({
        email: s.email,
        name: s.name,
        recipientId: String(s.recipientId), // Garante que seja string
        routingOrder: String(s.routingOrder || "1"),
        clientUserId: s.clientUserId,
      });
      
      // Construir Tabs para o signer (com anchorString)
      let sdkTabs = {};
      if (s.tabs.signHereTabs) {
        sdkTabs.signHereTabs = s.tabs.signHereTabs.map(t => docusign.SignHere.constructFromObject(t));
      }
      if (s.tabs.dateSignedTabs) {
        sdkTabs.dateSignedTabs = s.tabs.dateSignedTabs.map(t => docusign.DateSigned.constructFromObject(t));
      }
      if (s.tabs.fullNameTabs) {
        sdkTabs.fullNameTabs = s.tabs.fullNameTabs.map(t => docusign.FullName.constructFromObject(t));
      }
      // Adicione outros tipos de tabs se necessário
      signer.tabs = docusign.Tabs.constructFromObject(sdkTabs);
      return signer;
    }),
    carbonCopies: (envelopeArgs.recipients.carbonCopies || []).map(cc => 
      docusign.CarbonCopy.constructFromObject({
        email: cc.email,
        name: cc.name,
        recipientId: String(cc.recipientId),
        routingOrder: String(cc.routingOrder || (envelopeArgs.recipients.signers.length + 1))
      })
    )
  });

  env.status = envelopeArgs.status || "sent";

  console.log("[docusign-actions] Criando envelope dinâmico. Definição (sem base64 do doc):");
  console.log(JSON.stringify({ ...env, documents: env.documents.map(d => ({...d, documentBase64: "BASE64_REMOVIDA_DO_LOG"})) }, null, 2));
  
  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("[docusign-actions] Envelope dinâmico criado com sucesso. ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    console.error("[docusign-actions] Erro ao criar envelope dinâmico:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorBody = err.response && (err.response.data || err.response.body);
    let docusignErrorMessage = "Erro desconhecido do Docusign.";
    if (errorBody) {
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
        docusignErrorMessage = errorBody.message || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
        if (errorBody.errorDetails && errorBody.errorDetails.message) docusignErrorMessage += ` (${errorBody.errorDetails.message})`;
    } else if (err.message) {
        docusignErrorMessage = err.message;
    }
    throw new Error(`Erro ao criar envelope dinâmico. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Função para Criar Recipient View (assinatura embutida) ---
async function createRecipientView(apiClient, args) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const viewRequest = new docusign.RecipientViewRequest.constructFromObject({
    returnUrl: args.returnUrl,
    authenticationMethod: 'none', // Para clientUserId, 'none' é comum
    email: args.signerEmail,
    userName: args.signerName,
    clientUserId: args.signerClientUserId,
    // pingFrequency: '600', // Opcional
    // pingUrl: 'SUA_URL_DE_PING_SE_NECESSARIO', // Opcional
  });

  console.log("[docusign-actions] Criando recipient view para envelope:", args.envelopeId, "Payload:", JSON.stringify(viewRequest, null, 2));
  try {
    const results = await envelopesApi.createRecipientView(accountId, args.envelopeId, {
      recipientViewRequest: viewRequest,
    });
    console.log("[docusign-actions] URL de assinatura embutida gerada com sucesso.");
    return results.url;
  } catch (err) {
    console.error("[docusign-actions] Erro ao criar recipient view:", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
    let errorBody = err.response && (err.response.data || err.response.body);
    let docusignErrorMessage = "Erro desconhecido do Docusign.";
     if (errorBody) {
        if (typeof errorBody === 'string') { try { errorBody = JSON.parse(errorBody); } catch (e) { /* ignora */ } }
        docusignErrorMessage = errorBody.message || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
    } else if (err.message) {
        docusignErrorMessage = err.message;
    }
    throw new Error(`Erro ao gerar URL de assinatura. Docusign: ${docusignErrorMessage}`);
  }
}

// --- Handler Principal da Netlify Function ---
// Use 'export const handler' se seus arquivos de função terminam em .mjs ou se configurou type: "module" no package.json
// Use 'exports.handler' se seus arquivos terminam em .js (CommonJS)
exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método não permitido." };
  }

  let action, payload;
  try {
    const body = JSON.parse(event.body);
    action = body.action;
    payload = body.payload;
  } catch (e) {
    return { statusCode: 400, body: "Requisição mal formatada ou corpo JSON inválido." };
  }

  if (!action) {
    return { statusCode: 400, body: "Ação não especificada." };
  }

  console.log(`[docusign-actions] Ação recebida: ${action}`);
  // console.log("[docusign-actions] Payload recebido:", JSON.stringify(payload, null, 2)); // Cuidado ao logar payloads grandes

  try {
    const apiClient = await getAuthenticatedApiClient();

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE_FROM_TEMPLATE":
        if (!payload || !payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
          return { statusCode: 400, body: "Dados insuficientes para criar envelope de template." };
        }
        const templateEnvelopeId = await createEnvelopeForEmbeddedSigning(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ envelopeId: templateEnvelopeId }) };

      case "CREATE_DYNAMIC_EMBEDDED_ENVELOPE":
        if (!payload || !payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
          return { statusCode: 400, body: "Dados insuficientes para criar envelope dinâmico." };
        }
        for (const signer of payload.recipients.signers) {
            if (!signer.email || !signer.name || !signer.recipientId || !signer.clientUserId || !signer.tabs) {
                 return { statusCode: 400, body: `Signatário com recipientId '${signer.recipientId || "DESCONHECIDO"}' tem dados faltando.` };
            }
        }
        const dynamicEnvelopeId = await createDynamicEnvelope(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ envelopeId: dynamicEnvelopeId }) };

      case "GET_EMBEDDED_SIGNING_URL":
        if (!payload || !payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId || !payload.returnUrl) {
          return { statusCode: 400, body: "Dados insuficientes para gerar URL de assinatura." };
        }
        const signingUrl = await createRecipientView(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ signingUrl: signingUrl }) };
      
      default:
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }
  } catch (error) {
    console.error(`[docusign-actions] Erro CRÍTICO ao processar ação '${action}':`, error.message);
    if (error.stack && !error.message.includes(error.stack.split('\n')[0])) {
        console.error("[docusign-actions] Stack do Erro:", error.stack);
    }
    // Para o cliente, envie uma mensagem de erro mais genérica, mas logue o detalhe
    return { 
        statusCode: 500, 
        body: JSON.stringify({ 
            error: "Erro interno ao processar requisição Docusign.",
            details: error.message // Envia a mensagem de erro construída pelas funções internas
        }) 
    };
  }
};