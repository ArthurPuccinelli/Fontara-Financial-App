// netlify/functions/docusign-actions.js
const docusign = require('docusign-esign');
const { Buffer } = require('buffer'); // Explicit import for Buffer

// Variáveis de ambiente esperadas
const EXPECTED_ENV_VARS = [
    'DOCUSIGN_IK',
    'DOCUSIGN_USER_ID',
    'DOCUSIGN_ACCOUNT_ID',
    'DOCUSIGN_RSA_PEM_AS_BASE64',
    'DOCUSIGN_AUTH_SERVER',
    'DOCUSIGN_BASE_PATH'
];

/**
 * @summary Obtém um cliente de API DocuSign autenticado usando JWT Grant.
 * @returns {Promise<docusign.ApiClient>} Cliente da API DocuSign autenticado.
 * @throws {Error} Se as variáveis de ambiente estiverem ausentes, a chave PEM for inválida ou a autenticação falhar.
 */
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

/**
 * @summary Formata e loga detalhes de erros da API DocuSign.
 * @param {string} actionName Nome da ação onde o erro ocorreu.
 * @param {Error} errorObject Objeto de erro capturado.
 * @returns {string} Mensagem de erro específica do DocuSign.
 */
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

/**
 * @summary Cria um envelope a partir de um template para assinatura embutida.
 * @param {docusign.ApiClient} apiClient Cliente da API DocuSign autenticado.
 * @param {object} envelopeArgs Argumentos para criação do envelope.
 * @param {string} envelopeArgs.templateId ID do template DocuSign.
 * @param {string} envelopeArgs.signerEmail Email do signatário.
 * @param {string} envelopeArgs.signerName Nome do signatário.
 * @param {string} envelopeArgs.signerClientUserId ID de cliente único para o signatário.
 * @param {string} [envelopeArgs.roleName='signer'] Nome do papel do template para o signatário.
 * @param {string} [envelopeArgs.status='sent'] Status do envelope (e.g., 'sent', 'created').
 * @returns {Promise<string>} ID do envelope criado.
 * @throws {Error} Se a criação do envelope falhar.
 */
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
        clientUserId: signerClientUserId, // Essencial para assinatura embutida
        // routingOrder: '1' // Se necessário, pode ser adicionado
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

/**
 * @summary Cria um envelope dinâmico com documentos e signatários especificados.
 * @param {docusign.ApiClient} apiClient Cliente da API DocuSign autenticado.
 * @param {object} envelopeArgs Argumentos para criação do envelope.
 * @param {string} [envelopeArgs.emailSubject='Por favor, assine este documento'] Assunto do email.
 * @param {Array<object>} envelopeArgs.documents Array de documentos.
 * @param {string} envelopeArgs.documents[].documentBase64 Conteúdo do documento em Base64.
 * @param {string} envelopeArgs.documents[].name Nome do documento.
 * @param {string} envelopeArgs.documents[].fileExtension Extensão do arquivo (e.g., 'pdf', 'docx').
 * @param {string} envelopeArgs.documents[].documentId ID único para o documento.
 * @param {object} envelopeArgs.recipients Objeto com informações dos destinatários.
 * @param {Array<object>} envelopeArgs.recipients.signers Array de signatários.
 * @param {string} envelopeArgs.recipients.signers[].email Email do signatário.
 * @param {string} envelopeArgs.recipients.signers[].name Nome do signatário.
 * @param {string} envelopeArgs.recipients.signers[].recipientId ID único para o destinatário.
 * @param {string} envelopeArgs.recipients.signers[].clientUserId ID de cliente para assinatura embutida.
 * @param {object} envelopeArgs.recipients.signers[].tabs Objeto de tabs para o signatário.
 * @param {string} [envelopeArgs.status='sent'] Status do envelope.
 * @returns {Promise<string>} ID do envelope criado.
 * @throws {Error} Se a criação do envelope falhar ou dados estiverem incompletos.
 */
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
            transformPdfFields: String(doc.transformPdfFields || "false") === "true" // Garante que seja string "true" ou "false"
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
                clientUserId: s.clientUserId, // Essencial para assinatura embutida
                tabs: docusign.Tabs.constructFromObject(s.tabs) // Assume que s.tabs já está no formato do SDK
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
    envDefinition.status = envelopeArgs.status || "sent"; // 'sent' para enviar imediatamente, 'created' para rascunho

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


/**
 * @summary Gera a URL de visualização do destinatário para assinatura embutida.
 * @description Esta função prepara a URL que será usada no frontend com DocuSign.js ou em um iframe.
 * Consulte: https://developers.docusign.com/docs/esign-rest-api/esign101/concepts/embedding/embedded-signing/
 * E para "Focused View": https://www.docusign.com/blog/developers/deep-dive-the-embedded-signing-recipient-view
 * @param {docusign.ApiClient} apiClient Cliente da API DocuSign autenticado.
 * @param {object} args Argumentos para a visualização do destinatário.
 * @param {string} args.envelopeId ID do envelope.
 * @param {string} args.signerEmail Email do signatário.
 * @param {string} args.signerName Nome do signatário.
 * @param {string} args.clientUserId ID de cliente único do signatário.
 * @param {string} args.returnUrl URL de retorno após a assinatura.
 * @param {boolean} [args.useFocusedView=false] Se true, tenta configurar uma "Focused View" (sem chrome do DocuSign).
 * @param {string} [args.frameAncestors] Para controle de onde o iframe pode ser renderizado (segurança). Ex: "https://example.com"
 * @param {string} [args.messageOrigins] Para controle de mensagens postMessage (segurança). Ex: "https://example.com"
 * @returns {Promise<string>} URL para a cerimônia de assinatura embutida.
 * @throws {Error} Se a geração da URL falhar.
 */
async function createRecipientViewUrl(apiClient, args) {
    const { envelopeId, signerEmail, signerName, clientUserId, returnUrl, useFocusedView = false } = args; // 'useFocusedView' é chave
    const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    const viewRequestOptions = {
        returnUrl: returnUrl,
        authenticationMethod: 'none',
        email: signerEmail,
        userName: signerName,
        clientUserId: clientUserId,
        // Adicionando mais opções para limpar a interface na Visualização Focada
        // Referência: https://developers.docusign.com/docs/esign-rest-api/reference/envelopes/envelopeviews/createrecipient/#schema__recipientviewrequest_settings
    };

    if (useFocusedView) {
        console.log("[docusign-actions] Configurando para Focused View. Aplicando recipientSettings...");
        // Configurações para uma Visualização Focada mais limpa
        // Os valores são strings 'true'/'false' conforme exemplos comuns, mas o SDK pode aceitar booleanos.
        // Teste com booleanos se as strings não surtirem o efeito desejado.
        viewRequestOptions.recipientSettings = {
            showHeader: 'false',         // Oculta o cabeçalho principal do DocuSign
            showToolbar: 'false',        // Oculta a barra de ferramentas com opções de documento
            showFinishButton: 'false',   // Oculta o botão "Concluir" padrão (você controlará pelo evento 'signing_complete')
            showCancelButton: 'false',   // Oculta o botão "Cancelar" padrão
            showDeclineButton: 'false',  // Oculta o botão "Recusar" padrão
            showViewDocumentsButton: 'false', // Oculta o botão para visualizar/baixar documentos
            showSaveButton: 'false',     // Oculta o botão "Salvar e Concluir Depois"
            // Adicione/remova conforme necessário para o nível de "foco" desejado
        };
        // Outras opções de controle de interface que podem ser úteis, dependendo da API (algumas podem ser obsoletas ou específicas)
        // viewRequestOptions.chromeControls = 'hide'; // Alternativa mais antiga, 'recipientSettings' é mais granular
        // viewRequestOptions.showProgressIndicator = 'false';
    } else {
        console.log("[docusign-actions] Configurando para Classic View.");
        // Para a visualização clássica, você pode explicitamente mostrar os controles ou deixar o padrão do DocuSign
        viewRequestOptions.recipientSettings = {
            showHeader: 'true',
            showToolbar: 'true',
            showFinishButton: 'true',
            showCancelButton: 'true',
            showDeclineButton: 'true',
            showViewDocumentsButton: 'true',
            showSaveButton: 'true',
        };
    }

    // Segurança adicional para iFrames (opcional, mas recomendado)
    // viewRequestOptions.frameAncestors = [window.location.origin]; // Exemplo, ajuste para sua necessidade
    // viewRequestOptions.messageOrigins = [window.location.origin];

    const recipientViewRequest = docusign.RecipientViewRequest.constructFromObject(viewRequestOptions);
    // ... (resto da função como antes) ...
    console.log(`[docusign-actions] Criando recipient view para envelope ${envelopeId}. Payload:`, JSON.stringify(recipientViewRequest, null, 2));

    try {
        const results = await envelopesApi.createRecipientView(accountId, envelopeId, { recipientViewRequest: recipientViewRequest });
        console.log("[docusign-actions] URL de assinatura embutida gerada com sucesso.");
        return results.url;
    } catch (err) {
        const docusignErrorMessage = logErrorDetails("createRecipientViewUrl", err);
        throw new Error(`Erro ao gerar URL de assinatura. Detalhe Docusign: ${docusignErrorMessage}`);
    }
}
/**
 * @summary Netlify Function handler para ações DocuSign.
 */
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

        if (!action) {
            throw new Error("'action' não especificada no corpo da requisição.");
        }
        if (!payload) {
            throw new Error("'payload' não especificado no corpo da requisição.");
        }
    } catch (e) {
        console.error("[docusign-actions] Erro ao fazer parse do corpo da requisição:", e.message);
        return { statusCode: 400, body: JSON.stringify({ error: "Requisição mal formatada ou corpo JSON inválido.", details: e.message }), headers: { 'Content-Type': 'application/json' } };
    }

    console.log(`[docusign-actions] Ação recebida: ${action}`);

    try {
        const apiClient = await getAuthenticatedApiClient();
        let resultData;

        switch (action) {
            case "CREATE_ENVELOPE_FROM_TEMPLATE": // Renomeado para consistência
                if (!payload.templateId || !payload.signerEmail || !payload.signerName || !payload.signerClientUserId) {
                    throw new Error("Dados insuficientes para 'CREATE_ENVELOPE_FROM_TEMPLATE': templateId, signerEmail, signerName, signerClientUserId são obrigatórios.");
                }
                const templateEnvelopeId = await createEnvelopeFromTemplate(apiClient, payload);
                resultData = { envelopeId: templateEnvelopeId };
                break;

            case "CREATE_DYNAMIC_ENVELOPE": // Renomeado para consistência
                 if (!payload.documents || !payload.recipients || !payload.recipients.signers || payload.recipients.signers.length === 0) {
                    throw new Error("Dados insuficientes para 'CREATE_DYNAMIC_ENVELOPE': documents e recipients.signers são obrigatórios.");
                }
                // Validação mais detalhada dos signers dentro da função createDynamicEnvelope
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
        console.error(`[docusign-actions] ERRO FINAL NO HANDLER para ação '${action}':`, error.message);
        // A função logErrorDetails já foi chamada dentro das funções específicas, então aqui podemos retornar o erro.message
        return {
            statusCode: error.message.includes("Variáveis de ambiente Docusign incompletas") || error.message.includes("Falha ao decodificar") ? 400 : 500,
            body: JSON.stringify({
                error: "Erro ao processar requisição Docusign.",
                details: error.message // error.message já deve conter o detalhe Docusign formatado
            }),
            headers: { 'Content-Type': 'application/json' }
        };
    }
};
