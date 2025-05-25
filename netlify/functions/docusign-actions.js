// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');
const { Buffer } = require('buffer');

// ... (CRITICAL_ENV_VARS, checkInitialEnvVariables, getAuthenticatedApiClient, logErrorDetails permanecem os mesmos da última versão) ...
const CRITICAL_ENV_VARS = [
    'DOCUSIGN_IK', 'DOCUSIGN_USER_ID', 'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_RSA_PEM_AS_BASE64', 'DOCUSIGN_AUTH_SERVER', 'DOCUSIGN_BASE_PATH'
];

function checkInitialEnvVariables() {
    console.log("[docusign-actions] Verificando variáveis de ambiente iniciais...");
    const missingCriticalVars = CRITICAL_ENV_VARS.filter(v => !process.env[v]);
    if (missingCriticalVars.length > 0) {
        const errorMessage = `Variáveis de ambiente Docusign CRÍTICAS ausentes: ${missingCriticalVars.join(', ')}. A função não pode operar.`;
        console.error(`[docusign-actions] ${errorMessage}`);
        throw new Error(errorMessage); 
    }
    console.log("[docusign-actions] Variáveis de ambiente críticas iniciais verificadas e presentes.");
}

async function getAuthenticatedApiClient() {
    const missingAuthVars = CRITICAL_ENV_VARS.filter(v => !process.env[v]);
    if (missingAuthVars.length > 0) {
        const errorMessage = `(getAuthenticatedApiClient) Variáveis de ambiente Docusign críticas para autenticação incompletas. Ausentes: ${missingAuthVars.join(', ')}`;
        console.error(`[docusign-actions] ${errorMessage}`);
        throw new Error(errorMessage);
    }

    const {
        DOCUSIGN_IK: ik, DOCUSIGN_USER_ID: userId, DOCUSIGN_RSA_PEM_AS_BASE64: rsaPrivateKeyBase64Encoded,
        DOCUSIGN_AUTH_SERVER: authServer, DOCUSIGN_BASE_PATH: basePath
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
        console.log(`[docusign-actions] (getAuthenticatedApiClient) Solicitando token JWT para userId: ${userId}, ik: ${ik.substring(0,5)}...`);
        const results = await apiClient.requestJWTUserToken(ik, userId, ['signature', 'impersonation'], Buffer.from(rsaPrivateKeyPemString), 3600);
        apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
        console.log("[docusign-actions] (getAuthenticatedApiClient) Token de acesso Docusign obtido com sucesso.");
        return apiClient;
    } catch (err) {
        console.error("[docusign-actions] (getAuthenticatedApiClient) FALHA NA AUTENTICAÇÃO JWT:");
        let detailedErrorMessage = "(getAuthenticatedApiClient) Erro ao autenticar com Docusign.";
        // ... (lógica de tratamento de erro detalhado)
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
        console.log("[docusign-actions] Objeto de erro não contém 'response'. Logando erro completo:");
        console.error(JSON.stringify(errorObject, Object.getOwnPropertyNames(errorObject).filter(key => key !== 'response'), 2));
    }
    return docusignSpecificError;
}


async function createDynamicEnvelope(apiClient, envelopeArgs) {
    console.log("[docusign-actions] (createDynamicEnvelope) Iniciando criação de envelope dinâmico...");
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    if (!envelopeArgs.documents || !Array.isArray(envelopeArgs.documents) || envelopeArgs.documents.length === 0) {
        console.error("[docusign-actions] (createDynamicEnvelope) Erro: Nenhum documento fornecido.");
        throw new Error("Nenhum documento fornecido para o envelope dinâmico.");
    }
    if (!envelopeArgs.recipients || !envelopeArgs.recipients.signers || !Array.isArray(envelopeArgs.recipients.signers) || envelopeArgs.recipients.signers.length === 0) {
        console.error("[docusign-actions] (createDynamicEnvelope) Erro: Nenhum signatário fornecido.");
        throw new Error("Nenhum signatário fornecido para o envelope dinâmico.");
    }

    const envDefinition = docusign.EnvelopeDefinition.constructFromObject({
        emailSubject: envelopeArgs.emailSubject || "Por favor, assine este documento via Fontara Financial",
        emailBlurb: envelopeArgs.emailBlurb || "Obrigado por sua colaboração.",
        status: envelopeArgs.status || "sent",
        documents: envelopeArgs.documents.map((doc, index) =>
            docusign.Document.constructFromObject({
                documentBase64: doc.documentBase64,
                name: doc.name || `Documento ${index + 1}`,
                fileExtension: doc.fileExtension || 'pdf',
                documentId: String(doc.documentId || (index + 1)),
                transformPdfFields: String(doc.transformPdfFields || "false") === "true"
            })
        ),
        recipients: docusign.Recipients.constructFromObject({
            signers: envelopeArgs.recipients.signers.map((s, index) => {
                // **MODIFICAÇÃO AQUI: Tabs agora são opcionais**
                if (!s.email || !s.name || !s.recipientId || !s.clientUserId) { // s.tabs removido da validação obrigatória
                    console.error(`[docusign-actions] (createDynamicEnvelope) Erro: Signatário ${s.recipientId || `(índice ${index})`} com dados básicos incompletos.`);
                    throw new Error(`Signatário ${s.recipientId || `(índice ${index})`} está com dados básicos incompletos (email, name, recipientId, clientUserId).`);
                }
                
                const signerDetails = {
                    email: s.email,
                    name: s.name,
                    recipientId: String(s.recipientId),
                    routingOrder: String(s.routingOrder || "1"),
                    clientUserId: s.clientUserId,
                };

                // Apenas adiciona tabs se elas forem fornecidas e não forem um objeto vazio
                if (s.tabs && typeof s.tabs === 'object' && Object.keys(s.tabs).length > 0) {
                    console.log(`[docusign-actions] (createDynamicEnvelope) Adicionando tabs para signatário ${s.recipientId}:`, s.tabs);
                    signerDetails.tabs = docusign.Tabs.constructFromObject(s.tabs);
                } else {
                    console.log(`[docusign-actions] (createDynamicEnvelope) Signatário ${s.recipientId} não terá tabs explícitas (C2A/free-form).`);
                    // Para Click-to-Agree/free-form, não definir tabs faz com que o DocuSign
                    // apresente um botão "Finish" para aceitar o documento como um todo.
                }
                return docusign.Signer.constructFromObject(signerDetails);
            }),
            carbonCopies: (envelopeArgs.recipients.carbonCopies || []).map(cc =>
                docusign.CarbonCopy.constructFromObject({
                    email: cc.email, name: cc.name, recipientId: String(cc.recipientId),
                    routingOrder: String(cc.routingOrder || (envelopeArgs.recipients.signers.length + 1))
                })
            )
        })
    });
    
    const envDefinitionForLog = { ...envDefinition, documents: envDefinition.documents.map(d => ({...d, documentBase64: `REMOVIDO_DO_LOG_TAMANHO_${d.documentBase64 ? d.documentBase64.length : 0}`})) };
    console.log("[docusign-actions] (createDynamicEnvelope) Definição do envelope (sem base64 completo):", JSON.stringify(envDefinitionForLog, null, 2));

    try {
        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        console.log("[docusign-actions] (createDynamicEnvelope) Envelope dinâmico criado com sucesso. ID:", results.envelopeId);
        if (!results.envelopeId) {
            console.error("[docusign-actions] (createDynamicEnvelope) API DocuSign retornou sucesso mas sem envelopeId. Resposta:", results);
            throw new Error("API DocuSign não retornou um envelopeId após criação bem-sucedida aparente.");
        }
        return results.envelopeId;
    } catch (err) {
        console.error("[docusign-actions] (createDynamicEnvelope) Erro ao chamar envelopesApi.createEnvelope.");
        const docusignErrorMessage = logErrorDetails("createDynamicEnvelope > envelopesApi.createEnvelope", err);
        throw new Error(`Erro ao criar envelope dinâmico. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

async function createRecipientViewUrl(apiClient, args) {
    // ... (função createRecipientViewUrl permanece a mesma da última versão, com logs para frameAncestors) ...
    console.log("[docusign-actions] (createRecipientViewUrl) Iniciando criação de URL de visualização...");
    const { envelopeId, signerEmail, signerName, clientUserId, returnUrl, useFocusedView = false } = args;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    const docusignAppUrl = process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("demo.docusign.net") ?
                           "https://apps-d.docusign.com" : 
                           (process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("stage.docusign.net") ?
                           "https://apps-s.docusign.com" : "https://apps.docusign.com");

    console.log(`[docusign-actions] (createRecipientViewUrl) docusignAppUrl: ${docusignAppUrl}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) APP_ORIGIN: ${process.env.APP_ORIGIN}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) CONTEXT: ${process.env.CONTEXT}`);
    console.log(`[docusign-actions] (createRecipientViewUrl) DEPLOY_PRIME_URL: ${process.env.DEPLOY_PRIME_URL}`);

    const envelopesApi = new docusign.EnvelopesApi(apiClient);
    const viewRequestOptions = {
        returnUrl: returnUrl, authenticationMethod: 'none',
        email: signerEmail, userName: signerName, clientUserId: clientUserId,
    };

    if (useFocusedView) {
        console.log("[docusign-actions] (createRecipientViewUrl) Configurando para Focused View...");
        viewRequestOptions.recipientSettings = { 
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
        
        if (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development') {
            const localDevPort = process.env.PORT || 8888;
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
        console.error("[docusign-actions] (createRecipientViewUrl) Erro ao chamar envelopesApi.createRecipientView.");
        const docusignErrorMessage = logErrorDetails("createRecipientViewUrl > envelopesApi.createRecipientView", err);
        throw new Error(`Erro ao gerar URL de assinatura. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

exports.handler = async (event, context) => {
    // ... (handler como na última versão, com logs e try-catch global) ...
    console.log("[docusign-actions] HANDLER INVOCADO. Timestamp:", new Date().toISOString());
    console.log("[docusign-actions] HTTP Method:", event.httpMethod);
    console.log("[docusign-actions] Path:", event.path);
    console.log("[docusign-actions] Headers (parcial):", JSON.stringify(event.headers).substring(0, 200) + "...");
    
    let action = "Não definida"; 
    let payloadForLog = "Não definido";

    try {
        checkInitialEnvVariables(); 

        console.log("[docusign-actions] Iniciando processamento da ação...");
        if (event.httpMethod !== "POST") {
            console.warn("[docusign-actions] Método não permitido:", event.httpMethod);
            return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido." }), headers: { 'Content-Type': 'application/json' } };
        }

        let payload;
        try {
            console.log("[docusign-actions] Analisando corpo da requisição...");
            if (!event.body) {
                console.error("[docusign-actions] Corpo da requisição está vazio.");
                throw new Error("Corpo da requisição está vazio.");
            }
            const requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;
            console.log("[docusign-actions] Corpo da requisição analisado.");
            
            action = requestBody.action;
            payload = requestBody.payload;
            payloadForLog = payload ? JSON.stringify(payload).substring(0, 500) + "..." : "Payload vazio ou ausente";

            if (!action) {
                console.error("[docusign-actions] 'action' não especificada no corpo da requisição.");
                throw new Error("'action' não especificada no corpo da requisição.");
            }
            console.log(`[docusign-actions] Ação recebida: ${action}`);
            console.log(`[docusign-actions] Payload para ${action} (parcial): ${payloadForLog}`);

        } catch (e) {
            console.error("[docusign-actions] Erro ao analisar corpo da requisição ou parâmetros faltando:", e.message);
            return { statusCode: 400, body: JSON.stringify({ error: "Requisição mal formatada, corpo JSON inválido ou parâmetros ausentes.", details: e.message }), headers: { 'Content-Type': 'application/json' } };
        }

        console.log(`[docusign-actions] Obtendo cliente API autenticado para ação: ${action}...`);
        const apiClient = await getAuthenticatedApiClient();
        console.log(`[docusign-actions] Cliente API autenticado obtido. Executando ação: ${action}...`);
        let resultData;

        switch (action) {
            case "CREATE_ENVELOPE_FROM_TEMPLATE": // Não estamos usando mais, mas mantendo por referência
                if (!payload || !payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
                    throw new Error("Dados insuficientes para 'CREATE_ENVELOPE_FROM_TEMPLATE'.");
                }
                resultData = { envelopeId: await createEnvelopeFromTemplate(apiClient, payload) }; // createEnvelopeFromTemplate não foi modificado
                break;
            case "CREATE_DYNAMIC_ENVELOPE":
                 if (!payload || !payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
                    throw new Error("Dados insuficientes para 'CREATE_DYNAMIC_ENVELOPE': documents e recipients.signers são obrigatórios no payload.");
                }
                resultData = { envelopeId: await createDynamicEnvelope(apiClient, payload) }; // Agora lida com tabs opcionais
                break;
            case "GET_EMBEDDED_SIGNING_URL":
                 if (!payload || !payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.clientUserId || !payload.returnUrl) {
                    throw new Error("Dados insuficientes para 'GET_EMBEDDED_SIGNING_URL'.");
                }
                resultData = { signingUrl: await createRecipientViewUrl(apiClient, payload) };
                break;
            default:
                console.warn(`[docusign-actions] Ação desconhecida recebida: ${action}`);
                return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }), headers: { 'Content-Type': 'application/json' } };
        }

        console.log(`[docusign-actions] Ação '${action}' processada com sucesso. Resultado (parcial):`, JSON.stringify(resultData).substring(0, 200) + "...");
        return { statusCode: 200, body: JSON.stringify(resultData), headers: { 'Content-Type': 'application/json' } };

    } catch (error) {
        console.error(`[docusign-actions] !!! ERRO CRÍTICO NO HANDLER !!! Para ação: '${action}'. Payload (parcial): ${payloadForLog}. Mensagem:`, error.message);
        console.error("[docusign-actions] Stack Trace do Erro Crítico:", error.stack);
        
        let statusCode = 500;
        if (error.message.includes("Variáveis de ambiente") || /* ... (outras condições de 400/401) ... */
            error.message.includes("Falha ao decodificar") ||
            error.message.includes("Requisição mal formatada") ||
            error.message.includes("Dados insuficientes") ||
            error.message.includes("action' não especificada") ||
            error.message.includes("payload' não especificado")) {
            statusCode = 400;
        } else if (error.message.includes("Erro ao autenticar com Docusign")) {
            statusCode = 401;
        } else if (error.message.includes("API DocuSign não retornou um envelopeId") || error.message.includes("Erro ao gerar URL de assinatura")) {
            statusCode = 500; 
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
