// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');
const { Buffer } = require('buffer');

const EXPECTED_ENV_VARS = [
    'DOCUSIGN_IK',
    'DOCUSIGN_USER_ID',
    'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_RSA_PEM_AS_BASE64',
    'DOCUSIGN_AUTH_SERVER',
    'DOCUSIGN_BASE_PATH',
    // APP_ORIGIN é importante, mas a função deve ser resiliente se não estiver lá
    // e logar um aviso, ao invés de quebrar a chamada para DocuSign.
];

async function getAuthenticatedApiClient() {
    // Verifica apenas as variáveis críticas para autenticação aqui.
    const criticalAuthVars = EXPECTED_ENV_VARS.filter(v => v !== 'APP_ORIGIN');
    const missingVars = criticalAuthVars.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        const errorMessage = `Variáveis de ambiente Docusign críticas para autenticação incompletas. Ausentes: ${missingVars.join(', ')}`;
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

    let rsaPrivateKeyPemString;
    try {
        rsaPrivateKeyPemString = Buffer.from(rsaPrivateKeyBase64Encoded, 'base64').toString('utf-8').trim();
        if (!rsaPrivateKeyPemString.startsWith("-----BEGIN RSA PRIVATE KEY-----") || !rsaPrivateKeyPemString.endsWith("-----END RSA PRIVATE KEY-----")) {
            throw new Error("Chave privada PEM decodificada de Base64 está inválida (delimitadores ausentes).");
        }
    } catch (e) {
        console.error("[docusign-actions] ERRO AO DECODIFICAR/VALIDAR A CHAVE PRIVADA BASE64:", e.message);
        throw new Error(`Falha ao decodificar/validar a chave privada: ${e.message}`);
    }

    const apiClient = new docusign.ApiClient({ basePath: basePath });
    apiClient.setOAuthBasePath(authServer);

    try {
        console.log(`[docusign-actions] Solicitando token JWT para userId: ${userId} e ik: ${ik.substring(0,5)}...`);
        const results = await apiClient.requestJWTUserToken(ik, userId, ['signature', 'impersonation'], Buffer.from(rsaPrivateKeyPemString), 3600);
        apiClient.addDefaultHeader('Authorization', `Bearer ${results.body.access_token}`);
        console.log("[docusign-actions] Token de acesso Docusign obtido com sucesso.");
        return apiClient;
    } catch (err) {
        console.error("[docusign-actions] FALHA NA AUTENTICAÇÃO JWT (getAuthenticatedApiClient):");
        let detailedErrorMessage = "Erro ao autenticar com Docusign.";
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

    console.log(`[docusign-actions] Criando envelope do template ID: ${templateId}. Definição:`, JSON.stringify(envDefinition, null, 2));
    try {
        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        console.log(`[docusign-actions] Envelope (template) criado com sucesso. ID: ${results.envelopeId}`);
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
    console.log("[docusign-actions] Criando envelope dinâmico. Definição (sem base64):", JSON.stringify(envDefinitionForLog, null, 2));

    try {
        const results = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envDefinition });
        console.log("[docusign-actions] Envelope dinâmico criado com sucesso. ID:", results.envelopeId);
        return results.envelopeId;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createDynamicEnvelope", err);
        throw new Error(`Erro ao criar envelope dinâmico. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}


async function createRecipientViewUrl(apiClient, args) {
    const { envelopeId, signerEmail, signerName, clientUserId, returnUrl, useFocusedView = false } = args;
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;

    // Determina a URL base do aplicativo DocuSign com base no ambiente (demo, stage, prod)
    const docusignAppUrl = process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("demo.docusign.net") ?
                           "https://apps-d.docusign.com" : 
                           (process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("stage.docusign.net") ?
                           "https://apps-s.docusign.com" : "https://apps.docusign.com");

    console.log(`[docusign-actions] docusignAppUrl determinada: ${docusignAppUrl}`);
    console.log(`[docusign-actions] APP_ORIGIN (process.env.APP_ORIGIN): ${process.env.APP_ORIGIN}`);
    console.log(`[docusign-actions] CONTEXT (process.env.CONTEXT): ${process.env.CONTEXT}`);
    console.log(`[docusign-actions] DEPLOY_PRIME_URL (process.env.DEPLOY_PRIME_URL): ${process.env.DEPLOY_PRIME_URL}`);


    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    const viewRequestOptions = {
        returnUrl: returnUrl,
        authenticationMethod: 'none',
        email: signerEmail,
        userName: signerName,
        clientUserId: clientUserId,
    };

    if (useFocusedView) {
        console.log("[docusign-actions] Configurando para Focused View...");
        viewRequestOptions.recipientSettings = {
            showHeader: 'false',        
            showToolbar: 'false',       
            showFinishButton: 'false',  
            showCancelButton: 'false',  
            showDeclineButton: 'false', 
            showViewDocumentsButton: 'false',
            showSaveButton: 'false',    
        };
        
        const appOriginFromEnv = process.env.APP_ORIGIN;
        const deployPrimeUrlFromEnv = (process.env.CONTEXT === 'deploy-preview' && process.env.DEPLOY_PRIME_URL) ? process.env.DEPLOY_PRIME_URL : null;
        
        viewRequestOptions.frameAncestors = [docusignAppUrl]; // Origem do DocuSign sempre presente

        if (appOriginFromEnv && typeof appOriginFromEnv === 'string' && appOriginFromEnv.trim() !== '' && appOriginFromEnv.startsWith('http')) {
            console.log(`[docusign-actions] Adicionando APP_ORIGIN a frameAncestors: ${appOriginFromEnv.trim()}`);
            viewRequestOptions.frameAncestors.push(appOriginFromEnv.trim());
        } else {
            console.warn(`[docusign-actions] APP_ORIGIN ('${appOriginFromEnv}') não é uma URL válida ou não está definido. Não foi adicionado a frameAncestors.`);
        }
        
        if (deployPrimeUrlFromEnv && typeof deployPrimeUrlFromEnv === 'string' && deployPrimeUrlFromEnv.trim() !== '' && deployPrimeUrlFromEnv.startsWith('http')) {
            const trimmedDeployPrimeUrl = deployPrimeUrlFromEnv.trim();
            if (!viewRequestOptions.frameAncestors.includes(trimmedDeployPrimeUrl)) {
                console.log(`[docusign-actions] Adicionando DEPLOY_PRIME_URL a frameAncestors: ${trimmedDeployPrimeUrl}`);
                viewRequestOptions.frameAncestors.push(trimmedDeployPrimeUrl);
            }
        } else if (process.env.CONTEXT === 'deploy-preview') {
             console.warn(`[docusign-actions] DEPLOY_PRIME_URL ('${deployPrimeUrlFromEnv}') não é uma URL válida ou não está definido no contexto de deploy-preview. Não foi adicionado a frameAncestors.`);
        }

        // Adicionar localhost para desenvolvimento local se APP_ORIGIN não for localhost
        // Isso pode ser necessário se você testar localmente e o APP_ORIGIN estiver configurado para o site Netlify.
        // Contudo, o ideal é que APP_ORIGIN reflita o ambiente de execução da função.
        // Para Netlify Dev, o APP_ORIGIN deveria ser algo como http://localhost:8888
        if (appOriginFromEnv && !appOriginFromEnv.includes('localhost') && (process.env.NETLIFY_DEV === 'true' || process.env.NODE_ENV === 'development')) {
            const localDevUrl = `http://localhost:${process.env.PORT || 8888}`; // Ajuste a porta se necessário
             if (!viewRequestOptions.frameAncestors.includes(localDevUrl)) {
                console.log(`[docusign-actions] Adicionando URL de desenvolvimento local a frameAncestors: ${localDevUrl}`);
                viewRequestOptions.frameAncestors.push(localDevUrl);
            }
        }
        
        viewRequestOptions.messageOrigins = [docusignAppUrl];

    } else {
        console.log("[docusign-actions] Configurando para Classic View (iframe).");
    }
    
    // Log final de frameAncestors antes da chamada
    console.log("[docusign-actions] frameAncestors final a ser usado:", JSON.stringify(viewRequestOptions.frameAncestors));
    console.log("[docusign-actions] messageOrigins final a ser usado:", JSON.stringify(viewRequestOptions.messageOrigins));


    const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject(viewRequestOptions);
    console.log(`[docusign-actions] Criando recipient view para envelope ${envelopeId}. Payload para DocuSign:`, JSON.stringify(recipientViewRequest, null, 2));

    try {
        const results = await envelopesApi.createRecipientView(accountId, envelopeId, { recipientViewRequest: recipientViewRequest });
        console.log("[docusign-actions] URL de assinatura embutida gerada com sucesso.");
        return results.url;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createRecipientViewUrl", err);
        throw new Error(`Erro ao gerar URL de assinatura. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

exports.handler = async (event, context) => {
    // ... (handler permanece o mesmo, mas agora createRecipientViewUrl tem mais logs)
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: JSON.stringify({ error: "Método não permitido." }), headers: { 'Content-Type': 'application/json' } };
    }

    let action, payload;
    try {
        if (!event.body) throw new Error("Corpo da requisição está vazio.");
        let requestBody = typeof event.body === "string" ? JSON.parse(event.body) : event.body;

        action = requestBody.action;
        payload = requestBody.payload;

        if (!action) throw new Error("'action' não especificada no corpo da requisição.");
        if (!payload) throw new Error("'payload' não especificado no corpo da requisição.");

    } catch (e) {
        console.error("[docusign-actions] Erro ao fazer parse do corpo da requisição:", e.message);
        return { statusCode: 400, body: JSON.stringify({ error: "Requisição mal formatada ou corpo JSON inválido.", details: e.message }), headers: { 'Content-Type': 'application/json' } };
    }

    console.log(`[docusign-actions] Ação recebida: ${action}`);
    console.log(`[docusign-actions] Payload recebido para ${action}:`, payload ? JSON.stringify(payload).substring(0, 500) + "..." : "Nenhum payload");


    try {
        const apiClient = await getAuthenticatedApiClient();
        let resultData;

        switch (action) {
            case "CREATE_ENVELOPE_FROM_TEMPLATE":
                if (!payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
                    throw new Error("Dados insuficientes para 'CREATE_ENVELOPE_FROM_TEMPLATE': templateId, signerEmail, signerName, signerClientUserId são obrigatórios.");
                }
                const templateEnvelopeId = await createEnvelopeFromTemplate(apiClient, payload);
                resultData = { envelopeId: templateEnvelopeId };
                break;

            case "CREATE_DYNAMIC_ENVELOPE":
                 if (!payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
                    throw new Error("Dados insuficientes para 'CREATE_DYNAMIC_ENVELOPE': documents e recipients.signers são obrigatórios.");
                }
                const dynamicEnvelopeId = await createDynamicEnvelope(apiClient, payload);
                resultData = { envelopeId: dynamicEnvelopeId };
                break;

            case "GET_EMBEDDED_SIGNING_URL":
                if (!payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.clientUserId || !payload.returnUrl) {
                    throw new Error("Dados insuficientes para 'GET_EMBEDDED_SIGNING_URL': envelopeId, signerEmail, signerName, clientUserId, returnUrl são obrigatórios.");
                }
                const signingUrl = await createRecipientViewUrl(apiClient, payload);
                resultData = { signingUrl: signingUrl };
                break;

            default:
                console.warn(`[docusign-actions] Ação desconhecida recebida: ${action}`);
                return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }), headers: { 'Content-Type': 'application/json' } };
        }

        console.log(`[docusign-actions] Ação '${action}' processada com sucesso.`);
        return { statusCode: 200, body: JSON.stringify(resultData), headers: { 'Content-Type': 'application/json' } };

    } catch (error) {
        console.error(`[docusign-actions] ERRO FINAL NO HANDLER para ação '${action}':`, error.message, error.stack);
        // A função logErrorDetails já foi chamada dentro das funções específicas se o erro veio da API DocuSign.
        // Para outros erros (como falha na autenticação ou parse), error.message é suficiente.
        let statusCode = 500;
        if (error.message.includes("Variáveis de ambiente") || 
            error.message.includes("Falha ao decodificar") ||
            error.message.includes("Requisição mal formatada") ||
            error.message.includes("Dados insuficientes")) {
            statusCode = 400;
        }

        return {
            statusCode: statusCode,
            body: JSON.stringify({
                error: "Erro ao processar requisição Docusign.",
                details: error.message 
            }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
