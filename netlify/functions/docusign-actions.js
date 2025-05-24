// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');
const { Buffer } = require('buffer');

// As variáveis de ambiente críticas para a função operar minimamente
const CRITICAL_ENV_VARS = [
    'DOCUSIGN_IK',
    'DOCUSIGN_USER_ID',
    'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_RSA_PEM_AS_BASE64',
    'DOCUSIGN_AUTH_SERVER',
    'DOCUSIGN_BASE_PATH'
    // APP_ORIGIN será verificado depois, pois o erro pode ser antes de usá-lo
];

// Função auxiliar para verificar variáveis de ambiente no início
function checkInitialEnvVariables() {
    console.log("[docusign-actions] Verificando variáveis de ambiente iniciais...");
    const missingCriticalVars = CRITICAL_ENV_VARS.filter(v => !process.env[v]);
    if (missingCriticalVars.length > 0) {
        const errorMessage = `Variáveis de ambiente Docusign CRÍTICAS ausentes: ${missingCriticalVars.join(', ')}. A função não pode operar.`;
        console.error(`[docusign-actions] ${errorMessage}`);
        // Este erro deve ser fatal e impedir a continuação normal.
        // Lançar um erro aqui pode não ser logado se o erro for na infra da Netlify,
        // mas o log acima deveria aparecer se a função chegar a este ponto.
        throw new Error(errorMessage); 
    }
    console.log("[docusign-actions] Variáveis de ambiente críticas iniciais verificadas.");
}


async function getAuthenticatedApiClient() {
    // A verificação das variáveis já foi feita em checkInitialEnvVariables
    // ou será feita aqui se checkInitialEnvVariables não for chamada antes ou falhar silenciosamente.
    // Repetir a verificação aqui por segurança para esta função específica.
    const missingAuthVars = CRITICAL_ENV_VARS.filter(v => !process.env[v]);
    if (missingAuthVars.length > 0) {
        const errorMessage = `(getAuthenticatedApiClient) Variáveis de ambiente Docusign críticas para autenticação incompletas. Ausentes: ${missingAuthVars.join(', ')}`;
        console.error(`[docusign-actions] ${errorMessage}`);
        throw new Error(errorMessage);
    }

    const {
        DOCUSIGN_IK: ik,
        DOCUSIGN_USER_ID: userId,
        DOCUSIGN_RSA_PEM_AS_BASE64: rsaPrivateKeyBase64Encoded,
        DOCUSIGN_AUTH_SERVER: authServer,
        DOCUSIGN_BASE_PATH: basePath
    } = process.env;

    console.log("[docusign-actions] (getAuthenticatedApiClient) Decodificando chave RSA...");
    let rsaPrivateKeyPemString;
    try {
        rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8').trim();
        if (!rsaPrivateKeyPemString.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPemString.endsWith("-----END RSA PRIVATE KEY-----")) {
            throw new Error("Chave privada PEM decodificada de Base64 está inválida (delimitadores ausentes).");
        }
    } catch (e) {
        console.error("[docusign-actions] (getAuthenticatedApiClient) ERRO AO DECODIFICAR/VALIDAR A CHAVE PRIVADA BASE64:", e.message);
        throw new Error(`(getAuthenticatedApiClient) Falha ao decodificar/validar a chave privada: ${e.message}`);
    }
    console.log("[docusign-actions] (getAuthenticatedApiClient) Chave RSA decodificada com sucesso.");

    const apiClient = new docusign.ApiClient({ basePath: basePath });
    apiClient.setOAuthBasePath(authServer);

    try {
        console.log(`[docusign-actions] (getAuthenticatedApiClient) Solicitando token JWT para userId: ${userId} e ik: ${ik.substring(0,5)}...`);
        const results = await apiClient.requestJWTUserToken(ik, userId, ['signature', 'impersonation'], Buffer.from(rsaPrivateKeyPemString), 3600);
        apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
        console.log("[docusign-actions] (getAuthenticatedApiClient) Token de acesso Docusign obtido com sucesso.");
        return apiClient;
    } catch (err) {
        // ... (lógica de log de erro do getAuthenticatedApiClient permanece a mesma) ...
        console.error("[docusign-actions] (getAuthenticatedApiClient) FALHA NA AUTENTICAÇÃO JWT:");
        let detailedErrorMessage = "(getAuthenticatedApiClient) Erro ao autenticar com Docusign.";
        if (err.response && (err.response.data || err.response.body)) {
            let errorBody = err.response.data || err.response.body;
            try {
                if (typeof errorBody === 'string') errorBody = JSON.parse(errorBody);
                console.error("Corpo da Resposta de Erro Docusign (Autenticação):", JSON.stringify(errorBody, null, 2));
                const docusignSpecificError = errorBody.error_description || errorBody.error || (typeof errorBody === 'string' ? errorBody : JSON.stringify(errorBody));
                detailedErrorMessage += ` Detalhe Docusign: ${docusignSpecificError}`;
            } catch (parseError) {
                 console.error("Erro ao fazer parse do corpo da resposta de erro Docusign:", parseError);
                 detailedErrorMessage += ` Corpo da resposta: ${String(errorBody)}`;
            }
        } else {
            console.error("Mensagem de Erro (Autenticação):", err.message);
            console.error("Objeto de Erro Completo (Autenticação):", JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
            detailedErrorMessage += ` Detalhe: ${err.message}`;
        }
        throw new Error(detailedErrorMessage);
    }
}

function logErrorDetails(actionName, errorObject) {
    // ... (função logErrorDetails permanece a mesma)
    console.error(`--------------------------------------------------------------------`);
    console.error(`[docusign-actions] ERRO NA AÇÃO: ${actionName}`);
    console.error(`--------------------------------------------------------------------`);
    console.error("Mensagem Principal (errorObject.message):", errorObject.message);
    if (errorObject.code) console.error("Código (Axios/Node):", errorObject.code);

    let docusignSpecificError = "Detalhes específicos do Docusign não capturados ou não presentes na resposta.";
    if (errorObject.response) {
        console.error("Status da Resposta Docusign:", errorObject.response.status);
        const errorBody = errorObject.response.data || errorObject.response.body;
        if (errorBody) {
            let parsedBody = errorBody;
            if (typeof errorBody === 'string') {
                try { parsedBody = JSON.parse(errorBody); } catch (e) { /* Mantém como string se não for JSON */ }
            }
            console.error(">>> CORPO DA RESPOSTA DE ERRO DOCUSIGN:", JSON.stringify(parsedBody, null, 2));

            if (typeof parsedBody === 'object' && parsedBody !== null) {
                docusignSpecificError = parsedBody.message || parsedBody.error_description || parsedBody.error || JSON.stringify(parsedBody);
                if (parsedBody.errorDetails && Array.isArray(parsedBody.errorDetails) && parsedBody.errorDetails.length > 0) {
                    const detailsMessages = parsedBody.errorDetails.map(detail => `${detail.errorCode ? `[${detail.errorCode}] ` : ''}${detail.message}`).join('; ');
                    docusignSpecificError += ` | Detalhes Adicionais: ${detailsMessages}`;
                } else if (parsedBody.errorCode && parsedBody.message && !String(docusignSpecificError).includes(parsedBody.message)) {
                     docusignSpecificError = `Código: ${parsedBody.errorCode}, Mensagem: ${parsedBody.message}`;
                }
            } else if (typeof parsedBody === 'string') {
                docusignSpecificError = parsedBody;
            }
        } else {
            console.error("Corpo da resposta de erro Docusign não encontrado.");
        }
    } else {
        console.log("[docusign-actions] Objeto 'err' não contém 'err.response'. Logando err completo:");
        console.error(JSON.stringify(errorObject, Object.getOwnPropertyNames(errorObject), 2));
    }
    return docusignSpecificError;
}

async function createEnvelopeFromTemplate(apiClient, envelopeArgs) {
    // ... (função createEnvelopeFromTemplate permanece a mesma)
    const { templateId, signerEmail, signerName, signerClientUserId, roleName = 'signer', status = 'sent' } = envelopeArgs;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    const envDefinition = new docusign.EnvelopeDefinition();
    envDefinition.templateId = templateId;

    const signer = docusign.TemplateRole.constructFromObject({
        email: signerEmail,
        name: signerName,
        roleName: roleName,
        clientUserId: signerClientUserId,
    });
    envDefinition.templateRoles = [signer];
    envDefinition.status = status;

    console.log(`[docusign-actions] (createEnvelopeFromTemplate) Criando envelope do template ID: ${templateId}.`);
    try {
        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        console.log(`[docusign-actions] (createEnvelopeFromTemplate) Envelope (template) criado com sucesso. ID: ${results.envelopeId}`);
        return results.envelopeId;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createEnvelopeFromTemplate", err);
        throw new Error(`Erro ao criar envelope (template). Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

async function createDynamicEnvelope(apiClient, envelopeArgs) {
    // ... (função createDynamicEnvelope permanece a mesma)
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) {
        throw new Error("Nenhum documento fornecido para o envelope dinâmico.");
    }
    if (!envelopeArgs.recipients || !envelopeArgs.recipients.signers || !Array.isArray(envelopeArgs.recipients.signers) || envelopeArgs.recipients.signers.length === 0) {
        throw new Error("Nenhum signatário fornecido para o envelope dinâmico.");
    }

    const envDefinition = new docusign.EnvelopeDefinition();
    envDefinition.emailSubject = envelopeArgs.emailSubject || "Por favor, assine este documento via Fontara Financial";
    envDefinition.emailBlurb = envelopeArgs.emailBlurb || "Obrigado por sua colaboração.";

    envDefinition.documents = envelopeArgs.documents.map((doc, index) =>
        docusign.Document.constructFromObject({
            documentBase64: doc.documentBase64,
            name: doc.name || `Documento ${index + 1}`,
            fileExtension: doc.fileExtension || 'pdf',
            documentId: String(doc.documentId || (index + 1)),
            transformPdfFields: String(doc.transformPdfFields || "false") === "true"
        })
    );

    envDefinition.recipients = docusign.Recipients.constructFromObject({
        signers: envelopeArgs.recipients.signers.map((s, index) => {
            if (!s.email || !s.name || !s.recipientId || !s.clientUserId || !s.tabs) {
                throw new Error(`Signatário ${s.recipientId || `(índice ${index})`} está com dados incompletos (email, name, recipientId, clientUserId, tabs).`);
            }
            const signerObj = docusign.Signer.constructFromObject({
                email: s.email,
                name: s.name,
                recipientId: String(s.recipientId),
                routingOrder: String(s.routingOrder || "1"),
                clientUserId: s.clientUserId,
                tabs: docusign.Tabs.constructFromObject(s.tabs)
            });
            return signerObj;
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
    envDefinition.status = envelopeArgs.status || "sent";

    const envDefinitionForLog = { ...envDefinition, documents: envDefinition.documents.map(d => ({...d, documentBase64: "REMOVIDO_DO_LOG"})) };
    console.log("[docusign-actions] (createDynamicEnvelope) Criando envelope dinâmico...");

    try {
        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        console.log("[docusign-actions] (createDynamicEnvelope) Envelope dinâmico criado com sucesso. ID:", results.envelopeId);
        return results.envelopeId;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createDynamicEnvelope", err);
        throw new Error(`Erro ao criar envelope dinâmico. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

async function createRecipientViewUrl(apiClient, args) {
    console.log("[docusign-actions] (createRecipientViewUrl) Iniciando criação de URL de visualização...");
    const { envelopeId, signerEmail, signerName, clientUserId, returnUrl, useFocusedView = false } = args;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    const docusignAppUrl = process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("demo.docusign.net") ?
                           "https://apps-d.docusign.com" : 
                           (process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("stage.docusign.net") ?
                           "https://apps-s.docusign.com" : "https://apps.docusign.com");

    console.log(`[docusign-actions] (createRecipientViewUrl) docusignAppUrl determinada: ${docusignAppUrl}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) APP_ORIGIN (process.env.APP_ORIGIN): ${process.env.APP_ORIGIN}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) CONTEXT (process.env.CONTEXT): ${process.env.CONTEXT}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) DEPLOY_PRIME_URL (process.env.DEPLOY_PRIME_URL): ${process.env.DEPLOY_PRIME_URL}`);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    const viewRequestOptions = {
        returnUrl: returnUrl,
        authenticationMethod: 'none',
        email: signerEmail,
        userName: signerName,
        clientUserId: clientUserId,
    };

    if (useFocusedView) {
        console.log("[docusign-actions] (createRecipientViewUrl) Configurando para Focused View...");
        viewRequestOptions.recipientSettings = { /* ... (configurações como antes) ... */ 
            showHeader: 'false', showToolbar: 'false', showFinishButton: 'false',  
            showCancelButton: 'false', showDeclineButton: 'false', 
            showViewDocumentsButton: 'false', showSaveButton: 'false',    
        };
        
        const appOriginFromEnv = process.env.APP_ORIGIN;
        const deployPrimeUrlFromEnv = (process.env.CONTEXT === 'deploy-preview' && process.env.DEPLOY_PRIME_URL) ? process.env.DEPLOY_PRIME_URL : null;
        
        viewRequestOptions.frameAncestors = [docusignAppUrl];

        if (appOriginFromEnv && typeof appOriginFromEnv === 'string' && appOriginFromEnv.trim() !== '' && appOriginFromEnv.startsWith('http')) {
            viewRequestOptions.frameAncestors.push(appOriginFromEnv.trim());
        } else {
            console.warn(`[docusign-actions] (createRecipientViewUrl) APP_ORIGIN ('${appOriginFromEnv}') inválido/ausente. Não adicionado a frameAncestors.`);
        }
        
        if (deployPrimeUrlFromEnv && typeof deployPrimeUrlFromEnv === 'string' && deployPrimeUrlFromEnv.trim() !== '' && deployPrimeUrlFromEnv.startsWith('http')) {
            const trimmedDeployPrimeUrl = deployPrimeUrlFromEnv.trim();
            if (!viewRequestOptions.frameAncestors.includes(trimmedDeployPrimeUrl)) {
                viewRequestOptions.frameAncestors.push(trimmedDeployPrimeUrl);
            }
        } else if (process.env.CONTEXT === 'deploy-preview') {
             console.warn(`[docusign-actions] (createRecipientViewUrl) DEPLOY_PRIME_URL ('${deployPrimeUrlFromEnv}') inválido/ausente em deploy-preview. Não adicionado.`);
        }
        
        // Adicionar localhost para netlify dev
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
            const localDevPort = process.env.PORT || 8888; // Porta padrão do Netlify Dev ou a sua
            const localDevUrl = `http://localhost:${localDevPort}`;
             if (!viewRequestOptions.frameAncestors.includes(localDevUrl)) {
                console.log(`[docusign-actions] (createRecipientViewUrl) Adicionando URL de dev local a frameAncestors: ${localDevUrl}`);
                viewRequestOptions.frameAncestors.push(localDevUrl);
            }
        }
        viewRequestOptions.messageOrigins = [docusignAppUrl];
    } else {
        console.log("[docusign-actions] (createRecipientViewUrl) Configurando para Classic View.");
    }
    
    console.log("[docusign-actions] (createRecipientViewUrl) frameAncestors final:", JSON.stringify(viewRequestOptions.frameAncestors));
    console.log("[docusign-actions] (createRecipientViewUrl) messageOrigins final:", JSON.stringify(viewRequestOptions.messageOrigins));

    const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject(viewRequestOptions);
    console.log(`[docusign-actions] (createRecipientViewUrl) Payload para DocuSign API:`, JSON.stringify(recipientViewRequest, null, 2));

    try {
        const results = await envelopesApi.createRecipientView(accountId, envelopeId, { recipientViewRequest: recipientViewRequest });
        console.log("[docusign-actions] (createRecipientViewUrl) URL de assinatura embutida gerada.");
        return results.url;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createRecipientViewUrl > envelopesApi.createRecipientView", err); // Ação mais específica
        throw new Error(`Erro ao gerar URL de assinatura. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

exports.handler = async (event, context) => {
    // LOG INICIAL PARA VERIFICAR SE A FUNÇÃO É INVOCADA
    console.log("[docusign-actions] HANDLER INVOCADO. HTTP Method:", event.httpMethod);
    console.log("[docusign-actions] Evento recebido (parcial):", JSON.stringify(event, null, 2).substring(0, 1000)); // Loga parte do evento

    try {
        // VERIFICAÇÃO INICIAL DE VARIÁVEIS DE AMBIENTE CRÍTICAS
        checkInitialEnvVariables(); // Pode lançar erro se variáveis críticas estiverem faltando

        console.log("[docusign-actions] Iniciando processamento da ação...");
        if (event.httpMethod !== "POST") {
            console.log("[docusign-actions] Método não permitido:", event.httpMethod);
            return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido." }), headers: { 'Content-Type': 'application/json' } };
        }

        let action, payload;
        try {
            console.log("[docusign-actions] Analisando corpo da requisição...");
            if (!event.body) {
                console.error("[docusign-actions] Corpo da requisição está vazio.");
                throw new Error("Corpo da requisição está vazio.");
            }
            let requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            console.log("[docusign-actions] Corpo da requisição analisado.");
            
            action = requestBody.action;
            payload = requestBody.payload;

            if (!action) {
                console.error("[docusign-actions] 'action' não especificada.");
                throw new Error("'action' não especificada no corpo da requisição.");
            }
            if (!payload) {
                console.error("[docusign-actions] 'payload' não especificado para action:", action);
                // Algumas ações podem não precisar de payload, mas as suas precisam
                throw new Error(`'payload' não especificado para a ação '${action}'.`);
            }
            console.log(`[docusign-actions] Ação: ${action}`);
            console.log(`[docusign-actions] Payload para ${action} (parcial):`, JSON.stringify(payload).substring(0, 500) + "...");

        } catch (e) {
            console.error("[docusign-actions] Erro ao analisar corpo da requisição ou parâmetros faltando:", e.message);
            return { statusCode: 400, body: JSON.stringify({ error: "Requisição mal formatada ou parâmetros ausentes.", details: e.message }), headers: { 'Content-Type': 'application/json' } };
        }

        console.log(`[docusign-actions] Obtendo cliente API autenticado para ação: ${action}...`);
        const apiClient = await getAuthenticatedApiClient();
        console.log(`[docusign-actions] Cliente API autenticado obtido. Executando ação: ${action}...`);
        let resultData;

        switch (action) {
            case "CREATE_ENVELOPE_FROM_TEMPLATE":
                // ... (validação do payload como antes)
                resultData = await createEnvelopeFromTemplate(apiClient, payload);
                break;
            case "CREATE_DYNAMIC_ENVELOPE":
                // ... (validação do payload como antes)
                resultData = await createDynamicEnvelope(apiClient, payload);
                break;
            case "GET_EMBEDDED_SIGNING_URL":
                 if (!payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.clientUserId || !payload.returnUrl) {
                    throw new Error("Dados insuficientes para 'GET_EMBEDDED_SIGNING_URL': envelopeId, signerEmail, signerName, clientUserId, returnUrl são obrigatórios.");
                }
                resultData = { signingUrl: await createRecipientViewUrl(apiClient, payload) };
                break;
            default:
                console.warn(`[docusign-actions] Ação desconhecida recebida: ${action}`);
                return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }), headers: { 'Content-Type': 'application/json' } };
        }

        console.log(`[docusign-actions] Ação '${action}' processada com sucesso.`);
        return { statusCode: 200, body: JSON.stringify(resultData), headers: { 'Content-Type': 'application/json' } };

    } catch (error) {
        // ESTE É O CATCH GLOBAL DO HANDLER
        console.error(`[docusign-actions] !!! ERRO CRÍTICO NO HANDLER !!! Para ação (se definida): '${action || "Não definida"}'. Mensagem:`, error.message);
        console.error("[docusign-actions] Stack Trace do Erro Crítico:", error.stack);
        
        let statusCode = 500;
        // Tenta ser mais específico com o status code se possível
        if (error.message.includes("Variáveis de ambiente") || 
            error.message.includes("Falha ao decodificar") ||
            error.message.includes("Requisição mal formatada") ||
            error.message.includes("Dados insuficientes") ||
            error.message.includes("action' não especificada") ||
            error.message.includes("payload' não especificado")) {
            statusCode = 400;
        } else if (error.message.includes("Erro ao autenticar com Docusign")) {
            statusCode = 401; // Ou 500 se for uma falha interna na obtenção do token
        }

        return {
            statusCode: statusCode,
            body: JSON.stringify({
                error: "Erro crítico ao processar requisição Docusign na função.",
                details: error.message 
            }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
