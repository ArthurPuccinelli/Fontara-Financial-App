// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');

// --- Configuração do Cliente API Docusign (getApiClient - permanece a mesma da resposta anterior) ---
async function getApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  let rsaPrivateKeyContent = process.env.DOCUSIGN_RSA_PRIVATE_KEY;
  if (rsaPrivateKeyContent) {
      rsaPrivateKeyContent = rsaPrivateKeyContent.replace(/\\n/g, '\n');
  } else {
      throw new Error("Variável de ambiente DOCUSIGN_RSA_PRIVATE_KEY não está definida ou está vazia.");
  }
  const authServer = process.env.DOCUSIGN_AUTH_SERVER;
  const basePath = process.env.DOCUSIGN_BASE_PATH;

  if (!ik || !userId || !rsaPrivateKeyContent || !authServer || !basePath) {
    console.error("Variáveis de ambiente Docusign incompletas.");
    throw new Error("Variáveis de ambiente do Docusign não configuradas corretamente.");
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    console.log("Tentando obter token JWT Docusign...");
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'],
      Buffer.from(rsaPrivateKeyContent),
      3600
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("Erro detalhado ao obter token de acesso Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && err.response.body && err.response.body.error_description) {
        errorMessage += ` Detalhe: ${err.response.body.error_description}`;
    } else if (err.response && err.response.body && err.response.body.error) {
        errorMessage += ` Detalhe: ${err.response.body.error}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// --- Função para Criar Envelope usando Template (permanece a mesma) ---
async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  let env = new docusign.EnvelopeDefinition();
  env.templateId = envelopeArgs.templateId;

  let signer1 = docusign.TemplateRole.constructFromObject({
    email: envelopeArgs.signerEmail,
    name: envelopeArgs.signerName,
    roleName: envelopeArgs.roleName || 'signer',
    clientUserId: envelopeArgs.signerClientUserId,
  });
  
  env.templateRoles = [signer1];
  env.status = "sent";

  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("Envelope (template) criado com sucesso. Envelope ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    console.error("Erro ao criar envelope (template) Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao criar envelope (template) Docusign.";
    if (err.response && err.response.body && err.response.body.message) {
        errorMessage += ` Detalhe: ${err.response.body.message}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// --- NOVA Função para Criar Envelope Dinâmico (sem template) ---
async function createDynamicEnvelope(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  let env = new docusign.EnvelopeDefinition();
  env.emailSubject = envelopeArgs.emailSubject || "Por favor, assine este documento";
  env.emailBlurb = envelopeArgs.emailBlurb || "Obrigado por usar Docusign com Fontara Financial.";

  // 1. Definir Documentos
  // Espera-se que envelopeArgs.documents seja um array de objetos:
  // { name: "Documento.pdf", fileExtension: "pdf", documentId: "1", documentBase64: "BASE64_STRING..." }
  if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) {
    throw new Error("Nenhum documento fornecido para o envelope dinâmico.");
  }
  env.documents = envelopeArgs.documents.map(doc => {
    return docusign.Document.constructFromObject({
      documentBase64: doc.documentBase64,
      name: doc.name,
      fileExtension: doc.fileExtension,
      documentId: doc.documentId
    });
  });

  // 2. Definir Destinatários (Signers e CCs)
  // Espera-se que envelopeArgs.recipients seja um objeto com arrays: { signers: [], carbonCopies: [] }
  // Signer: { email, name, recipientId, clientUserId (para embutido), routingOrder, tabs: { signHereTabs: [...], textTabs: [...] }}
  // CC: { email, name, recipientId, routingOrder }
  if (!envelopeArgs.recipients || (!envelopeArgs.recipients.signers && !envelopeArgs.recipients.carbonCopies)) {
    throw new Error("Nenhum destinatário (signer ou cc) fornecido.");
  }

  let signers = [];
  if (envelopeArgs.recipients.signers && Array.isArray(envelopeArgs.recipients.signers)) {
    signers = envelopeArgs.recipients.signers.map(s => {
      let signer = docusign.Signer.constructFromObject({
        email: s.email,
        name: s.name,
        recipientId: s.recipientId,
        routingOrder: s.routingOrder || "1", // Padrão para 1 se não especificado
        clientUserId: s.clientUserId, // ESSENCIAL para assinatura embutida
      });

      // Construir Tabs para o signer
      let signerTabs = { signHereTabs: [], dateSignedTabs: [], fullNameTabs: [], textTabs: [], initialHereTabs: [] }; // Adicione mais tipos de tabs conforme necessário
      
      if (s.tabs) {
        if (s.tabs.signHereTabs) {
          signerTabs.signHereTabs = s.tabs.signHereTabs.map(t => docusign.SignHere.constructFromObject(t));
        }
        if (s.tabs.dateSignedTabs) {
          signerTabs.dateSignedTabs = s.tabs.dateSignedTabs.map(t => docusign.DateSigned.constructFromObject(t));
        }
        if (s.tabs.fullNameTabs) {
          signerTabs.fullNameTabs = s.tabs.fullNameTabs.map(t => docusign.FullName.constructFromObject(t));
        }
        if (s.tabs.textTabs) { // Exemplo para campos de texto preenchíveis
            signerTabs.textTabs = s.tabs.textTabs.map(t => docusign.Text.constructFromObject({
                documentId: t.documentId,
                pageNumber: t.pageNumber,
                xPosition: t.xPosition,
                yPosition: t.yPosition,
                tabLabel: t.tabLabel, // Importante para identificar o campo
                value: t.value || "", // Valor pré-preenchido (opcional)
                width: t.width || 120, // Largura do campo de texto (opcional)
                // ... outras propriedades de Text tab
            }));
        }
        // Adicione mais tipos de tabs aqui (initialHereTabs, checkboxTabs, etc.)
      }
      signer.tabs = docusign.Tabs.constructFromObject(signerTabs);
      return signer;
    });
  }

  let carbonCopies = [];
  if (envelopeArgs.recipients.carbonCopies && Array.isArray(envelopeArgs.recipients.carbonCopies)) {
    carbonCopies = envelopeArgs.recipients.carbonCopies.map(cc => {
      return docusign.CarbonCopy.constructFromObject({
        email: cc.email,
        name: cc.name,
        recipientId: cc.recipientId,
        routingOrder: cc.routingOrder || (signers.length > 0 ? parseInt(signers[signers.length -1].routingOrder) + 1 : "2").toString() // Coloca CC após os signatários
      });
    });
  }

  env.recipients = docusign.Recipients.constructFromObject({
    signers: signers,
    carbonCopies: carbonCopies
    // Adicione outros tipos de destinatários aqui se necessário (agents, editors, etc.)
  });

  // 3. Status do Envelope
  env.status = envelopeArgs.status || "sent"; // "sent" para enviar, "created" para salvar como rascunho

  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("Envelope dinâmico criado com sucesso. Envelope ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    console.error("Erro ao criar envelope dinâmico Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao criar envelope dinâmico Docusign.";
    if (err.response && err.response.body && err.response.body.message) {
        errorMessage += ` Detalhe: ${err.response.body.message}`;
    } else if (err.response && err.response.body && err.response.body.errorCode && err.response.body.message) {
        errorMessage += ` Código: ${err.response.body.errorCode}, Mensagem: ${err.response.body.message}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}


// --- Função para Criar Recipient View (permanece a mesma) ---
async function createRecipientView(apiClient, args) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = args.returnUrl; 
  viewRequest.authenticationMethod = 'none'; 
  viewRequest.email = args.signerEmail;
  viewRequest.userName = args.signerName;
  viewRequest.clientUserId = args.signerClientUserId; 

  try {
    const results = await envelopesApi.createRecipientView(accountId, args.envelopeId, {
      recipientViewRequest: viewRequest,
    });
    console.log("URL de assinatura embutida gerada.");
    return results.url;
  } catch (err) {
    console.error("Erro ao criar recipient view Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao gerar URL de assinatura Docusign.";
     if (err.response && err.response.body && err.response.body.message) {
        errorMessage += ` Detalhe: ${err.response.body.message}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// --- Handler Principal da Netlify Function (ATUALIZADO) ---
export const handler = async (event, context) => { // Mantido como ESM se você mudou para .mjs
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

  try {
    const apiClient = await getApiClient();

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE_FROM_TEMPLATE": // Renomeado para clareza
        if (!payload || !payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
          return { statusCode: 400, body: "Dados insuficientes para criar envelope de template." };
        }
        const templateEnvelopeId = await createEnvelopeForEmbeddedSigning(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ envelopeId: templateEnvelopeId }) };

      case "CREATE_DYNAMIC_EMBEDDED_ENVELOPE": // NOVA AÇÃO
        // Validação básica do payload para envelope dinâmico
        if (!payload || !payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
          return { statusCode: 400, body: "Dados insuficientes para criar envelope dinâmico (documentos e signatários são obrigatórios)." };
        }
        // Validação adicional para cada signatário (email, nome, recipientId, clientUserId, tabs)
        for (const signer of payload.recipients.signers) {
            if (!signer.email || !signer.name || !signer.recipientId || !signer.clientUserId || !signer.tabs) {
                 return { statusCode: 400, body: `Signatário com recipientId '${signer.recipientId || "DESCONHECIDO"}' tem dados faltando (email, nome, recipientId, clientUserId, tabs).` };
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
    console.error(`Erro ao processar ação Docusign '${action}':`, error.message, error.stack);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Erro interno ao processar requisição Docusign." }) };
  }
};