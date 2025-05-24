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
    'APP_ORIGIN' // Adicionada para frameAncestors
];

async function getAuthenticatedApiClient() {
    const missingVars = EXPECTED_ENV_VARS.filter(v => !process.env[v]);
    if (missingVars.length > 0) {
        const errorMessage = `Variáveis de ambiente Docusign incompletas. Ausentes: ${missingVars.join(', ')}`;
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
        // routingOrder: '1' 
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
    const appOrigin = process.env.APP_ORIGIN; // Ex: https://fontarafinancial.netlify.app ou http://localhost:8888
    const docusignAppUrl = process.env.DOCUSIGN_BASE_PATH && process.env.DOCUSIGN_BASE_PATH.includes("demo.docusign.net") ?
                           "https://apps-d.docusign.com" : "https://apps.docusign.com";

    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    const viewRequestOptions = {
        returnUrl: returnUrl, // Obrigatório, mas não usado pelo docusign.js
        authenticationMethod: 'none', // Ou 'email', 'sms', etc., conforme sua configuração de segurança
        email: signerEmail,
        userName: signerName,
        clientUserId: clientUserId,
    };

    if (useFocusedView) {
        console.log("[docusign-actions] Configurando para Focused View. Aplicando recipientSettings, frameAncestors e messageOrigins...");
        viewRequestOptions.recipientSettings = { // (implícito, pois StyleObject é parte da config do docusign.js)
            showHeader: 'false',        
            showToolbar: 'false',       
            showFinishButton: 'false',  
            showCancelButton: 'false',  
            showDeclineButton: 'false', 
            showViewDocumentsButton: 'false',
            showSaveButton: 'false',    
        };
        
        // Configurações de segurança para docusign.js
        viewRequestOptions.frameAncestors = [docusignAppUrl];
        if (appOrigin) { // Adiciona a origem da sua aplicação
            viewRequestOptions.frameAncestors.push(appOrigin);
            // Se tiver um deploy preview específico e quiser testar diretamente, pode adicionar essa URL aqui também
            // Ex: viewRequestOptions.frameAncestors.push("URL_DO_DEPLOY_PREVIEW_NETLIFY");
             if (process.env.CONTEXT === 'deploy-preview' && process.env.DEPLOY_PRIME_URL) {
                viewRequestOptions.frameAncestors.push(process.env.DEPLOY_PRIME_URL);
             }
             // Para desenvolvimento local, se APP_ORIGIN for localhost
             if (appOrigin.startsWith("http://localhost")) {
                // Não precisa adicionar nada extra normalmente, mas se tiver um alias
             }
        } else {
            console.warn("[docusign-actions] APP_ORIGIN não definido. frameAncestors pode estar incompleto para Focused View.");
        }
        
        viewRequestOptions.messageOrigins = [docusignAppUrl]; //

    } else {
        console.log("[docusign-actions] Configurando para Classic View (iframe).");
        // Para Classic View, frameAncestors e messageOrigins não são tipicamente usados da mesma forma que com docusign.js,
        // mas podem ser configurados para segurança adicional do iframe se necessário.
        // Se você for usar iframe, o returnUrl é crucial.
    }
    
    const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject(viewRequestOptions);
    console.log(`[docusign-actions] Criando recipient view para envelope ${envelopeId}. Payload:`, JSON.stringify(recipientViewRequest, null, 2));

    try {
        const results = await envelopesApi.createRecipientView(accountId, envelopeId, { recipientViewRequest: recipientViewRequest });
        console.log("[docusign-actions] URL de assinatura embutida gerada com sucesso.");
        return results.url; // Esta URL é usada pelo docusign.js no frontend
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createRecipientViewUrl", err);
        throw new Error(`Erro ao gerar URL de assinatura. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}

exports.handler = async (event, context) => {
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
                if (!payload.envelopeId || !payload.signerEmail || !payload.signerName || !payload.clientUserId || !payload.returnUrl) { // returnUrl continua obrigatório pela API DocuSign eSignature
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
        return {
            statusCode: error.message.includes("Variáveis de ambiente Docusign incompletas") || error.message.includes("Falha ao decodificar") ? 400 : 500,
            body: JSON.stringify({
                error: "Erro ao processar requisição Docusign.",
                details: error.message 
            }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
