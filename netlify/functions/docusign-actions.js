// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');

// --- Configuração do Cliente API Docusign ---
async function getApiClient() {
  const ik = process.env.DOCUSIGN_IK;
  const userId = process.env.DOCUSIGN_USER_ID;
  // A chave privada precisa ser formatada corretamente se tiver quebras de linha.
  // O Netlify geralmente lida bem com variáveis de ambiente multi-linha.
  const rsaPrivateKey = process.env.DOCUSIGN_RSA_PRIVATE_KEY.replace(/\\n/g, '\n'); 
  const authServer = process.env.DOCUSIGN_AUTH_SERVER; // ex: account-d.docusign.com
  const basePath = process.env.DOCUSIGN_BASE_PATH;     // ex: https://demo.docusign.net/restapi

  if (!ik || !userId || !rsaPrivateKey || !authServer || !basePath) {
    throw new Error("Variáveis de ambiente do Docusign não configuradas corretamente.");
  }

  const apiClient = new docusign.ApiClient({ basePath: basePath });
  apiClient.setOAuthBasePath(authServer);

  try {
    const results = await apiClient.requestJWTUserToken(
      ik,
      userId,
      ['signature', 'impersonation'], // Escopos necessários
      Buffer.from(rsaPrivateKey),    // Chave privada como Buffer
      3600                           // Tempo de expiração do token em segundos (1 hora)
    );
    apiClient.addDefaultHeader('Authorization', 'Bearer ' + results.body.access_token);
    console.log("Token de acesso Docusign obtido com sucesso.");
    return apiClient;
  } catch (err) {
    console.error("Erro ao obter token de acesso Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao autenticar com Docusign.";
    if (err.response && err.response.body && err.response.body.error_description) {
        errorMessage += ` Detalhe: ${err.response.body.error_description}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// --- Função para Criar e Enviar um Envelope para Assinatura Embutida ---
async function createEnvelopeForEmbeddedSigning(apiClient, envelopeArgs) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  // Exemplo de definição de envelope
  // Você precisará adaptar isso para seus documentos e signatários
  let env = new docusign.EnvelopeDefinition();
  env.templateId = envelopeArgs.templateId; // Se estiver usando um template do Docusign

  // Crie os papéis do template com base nos dados recebidos
  // Exemplo: se seu template tem um papel 'signer'
  let signer1 = docusign.TemplateRole.constructFromObject({
    email: envelopeArgs.signerEmail,
    name: envelopeArgs.signerName,
    roleName: envelopeArgs.roleName || 'signer', // Nome do papel no template
    clientUserId: envelopeArgs.signerClientUserId, // Essencial para assinatura embutida
    // Você pode adicionar mais tabs aqui se não estiverem no template ou se precisar pré-preencher
    // tabs: docusign.Tabs.constructFromObject({
    //   textTabs: [ docusign.Text.constructFromObject({ tabLabel: "NomeCompleto", value: envelopeArgs.signerName }) ]
    // })
  });
  
  // Se houver um segundo signatário ou CC, configure-os também
  // let cc1 = docusign.TemplateRole.constructFromObject({
  //   email: envelopeArgs.ccEmail,
  //   name: envelopeArgs.ccName,
  //   roleName: 'cc' 
  // });

  env.templateRoles = [signer1]; // Adicione outros papéis se necessário
  env.status = "sent"; // Envia o envelope imediatamente

  try {
    const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: env });
    console.log("Envelope criado com sucesso. Envelope ID:", results.envelopeId);
    return results.envelopeId;
  } catch (err) {
    console.error("Erro ao criar envelope Docusign:", JSON.stringify(err, null, 2));
    let errorMessage = "Erro ao criar envelope Docusign.";
    if (err.response && err.response.body && err.response.body.message) {
        errorMessage += ` Detalhe: ${err.response.body.message}`;
    } else if (err.message) {
        errorMessage += ` Detalhe: ${err.message}`;
    }
    throw new Error(errorMessage);
  }
}

// --- Função para Criar uma Visualização de Assinatura Embutida (Recipient View) ---
async function createRecipientView(apiClient, args) {
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  const envelopesApi = new docusign.EnvelopesApi(apiClient);

  const viewRequest = new docusign.RecipientViewRequest();
  viewRequest.returnUrl = args.returnUrl; // URL para onde o usuário é redirecionado após assinar
  viewRequest.authenticationMethod = 'none'; // Ou 'email', 'sms', etc. 'none' para clientUserId
  viewRequest.email = args.signerEmail;
  viewRequest.userName = args.signerName;
  viewRequest.clientUserId = args.signerClientUserId; // Deve ser o mesmo usado na criação do envelope
  // viewRequest.pingFrequency = '600'; // Opcional: frequência do ping em segundos
  // viewRequest.pingUrl = args.pingUrl; // Opcional: URL para ping se a janela do iframe for fechada

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


// --- Handler Principal da Netlify Function ---
export const handler = async (event, context) => {
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
    const apiClient = await getApiClient(); // Obtém o cliente API autenticado

    switch (action) {
      case "CREATE_EMBEDDED_ENVELOPE":
        // Payload esperado: { templateId, signerEmail, signerName, signerClientUserId, roleName (opcional) }
        if (!payload || !payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
          return { statusCode: 400, body: "Dados insuficientes para criar envelope embutido." };
        }
        const envelopeId = await createEnvelopeForEmbeddedSigning(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ envelopeId: envelopeId }) };

      case "GET_EMBEDDED_SIGNING_URL":
        // Payload esperado: { envelopeId, signerEmail, signerName, signerClientUserId, returnUrl }
        if (!payload || !payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId || !payload.returnUrl) {
          return { statusCode: 400, body: "Dados insuficientes para gerar URL de assinatura." };
        }
        const signingUrl = await createRecipientView(apiClient, payload);
        return { statusCode: 200, body: JSON.stringify({ signingUrl: signingUrl }) };
      
      // TODO: Adicione mais cases para outras ações do Docusign aqui
      // case "GET_ENVELOPE_STATUS":
      //   // ...
      //   break;

      default:
        return { statusCode: 400, body: `Ação desconhecida: ${action}` };
    }
  } catch (error) {
    console.error(`Erro ao processar ação Docusign '${action}':`, error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message || "Erro interno ao processar requisição Docusign." }) };
  }
};