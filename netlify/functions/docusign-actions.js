// netlify/functions/docusign-actions.ts
import { Handler, HandlerEvent, HandlerContext } from '@netlify/functions';
import * as docusign from 'docusign-esign';
import { readFileSync } from 'fs';
import { join } from 'path';

// Variáveis de Ambiente Essenciais (Configuradas no Netlify)
const DOCUSIGN_IK = process.env.DOCUSIGN_IK; // Integration Key (Client ID)
const DOCUSIGN_USER_ID = process.env.DOCUSIGN_USER_ID; // API Username (GUID do usuário impersonado)
const DOCUSIGN_ACCOUNT_ID = process.env.DOCUSIGN_ACCOUNT_ID; // API Account ID
const DOCUSIGN_BASE_PATH = process.env.DOCUSIGN_BASE_PATH; // Ex: "https://demo.docusign.net/restapi" ou "https://naX.docusign.net/restapi"
const DOCUSIGN_AUTH_SERVER = process.env.DOCUSIGN_AUTH_SERVER; // Ex: "account-d.docusign.com" para demo, "account.docusign.com" para prod

// A chave RSA PEM como string Base64 (para não armazenar o arquivo .pem diretamente)
const DOCUSIGN_RSA_PEM_AS_BASE64 = process.env.DOCUSIGN_RSA_PEM_AS_BASE64;

// Função auxiliar para inicializar o ApiClient do DocuSign com JWT Grant
async function getAuthenticatedApiClient(): Promise<docusign.ApiClient> {
    if (!DOCUSIGN_IK || !DOCUSIGN_USER_ID || !DOCUSIGN_RSA_PEM_AS_BASE64 || !DOCUSIGN_AUTH_SERVER) {
        throw new Error("Variáveis de ambiente DocuSign para JWT não configuradas corretamente.");
    }

    const apiClient = new docusign.ApiClient({ basePath: DOCUSIGN_BASE_PATH });
    const rsaPrivateKey = Buffer.from(DOCUSIGN_RSA_PEM_AS_BASE64, 'base64').toString('utf-8');

    try {
        const results = await apiClient.requestJWTUserToken(
            DOCUSIGN_IK,
            DOCUSIGN_USER_ID,
            ['signature', 'impersonation', 'click.manage', 'click.send'], // Escopos necessários
            rsaPrivateKey,
            3600 // Tempo de expiração do token em segundos
        );
        const accessToken = results.body.access_token;
        apiClient.addDefaultHeader('Authorization', `Bearer ${accessToken}`);
        console.log('Token JWT obtido com sucesso.');
        return apiClient;
    } catch (error: any) {
        console.error('Erro ao obter token JWT DocuSign:', error.response ? error.response.data : error.message);
        throw new Error(`Falha na autenticação DocuSign: ${error.message}`);
    }
}


// Ação para criar envelope e URL de assinatura (combinado para simplificar um pouco)
async function createAndGetSigningUrl(apiClient: docusign.ApiClient, payload: { envelopeDefinition: any, clientUserId: string }) {
    if (!DOCUSIGN_ACCOUNT_ID) {
        throw new Error("DOCUSIGN_ACCOUNT_ID não configurado.");
    }
    const { envelopeDefinition, clientUserId } = payload;
    const envelopesApi = new docusign.EnvelopesApi(apiClient);

    // Criar o envelope
    let results = await envelopesApi.createEnvelope(DOCUSIGN_ACCOUNT_ID, { envelopeDefinition });
    const envelopeId = results.envelopeId;
    if (!envelopeId) {
        throw new Error("Falha ao criar o envelope. ID não retornado.");
    }
    console.log(`Envelope criado com ID: ${envelopeId}`);

    // Criar a Recipient View (URL de assinatura embarcada)
    // O returnUrl será usado pelo DocuSign para redirecionar após a conclusão no modo iframe clássico.
    // Para docusign.js, os eventos no cliente são mais diretos.
    const viewRequest = docusign.RecipientViewRequest.constructFromObject({
        returnUrl: `${process.env.URL || 'http://localhost:8888'}/agradecimento/obrigado.html?envelopeId=${envelopeId}&event=signing_complete_from_classic`, // URL base do seu site Netlify
        authenticationMethod: 'none', // Ou 'email', 'sms', etc., conforme sua necessidade
        email: envelopeDefinition.recipients.signers[0].email,
        userName: envelopeDefinition.recipients.signers[0].name,
        clientUserId: clientUserId, // Essencial para assinatura embarcada
        // pingFrequency: '600', // Opcional
        // pingUrl: `${process.env.URL}/`, // Opcional: Deve ser uma URL pública
    });

    results = await envelopesApi.createRecipientView(DOCUSIGN_ACCOUNT_ID, envelopeId, { recipientViewRequest: viewRequest });
    console.log('URL de assinatura embarcada obtida.');
    return { signingUrl: results.url, envelopeId: envelopeId };
}

// Nova ação para Clickwraps
async function getClickwrapEmbedParams(apiClient: docusign.ApiClient, payload: { clickwrapId: string, clientUserId: string, email?: string, fullName?: string }) {
    if (!DOCUSIGN_ACCOUNT_ID || !DOCUSIGN_BASE_PATH) {
        throw new Error("DOCUSIGN_ACCOUNT_ID ou DOCUSIGN_BASE_PATH não configurado.");
    }
    const { clickwrapId, clientUserId, email, fullName } = payload;
    const clickApi = new docusign.ClickApi(apiClient);

    const clickwrapRequest = docusign.UserAgreementRequest.constructFromObject({
        clientUserId: clientUserId,
        // Você pode precisar adicionar 'documentData' se seu clickwrap for dinâmico
        // documentData: { key1: 'value1', key2: 'value2' }
    });

    try {
        // Esta chamada cria a "resposta do usuário" para o clickwrap e retorna a URL ou status.
        // A API real para obter uma "sessão" para renderizar um clickwrap pode variar.
        // O DocuSign.js renderClickwrap geralmente precisa do host, accountId, clickwrapId, clientUserId.
        // Esta função precisa garantir que uma sessão de concordância para o clientUserId pode ser iniciada.
        // A chamada POST /accounts/{accountId}/clickwraps/{clickwrapId}/agreements é para registrar a concordância.
        // Para *renderizar* um clickwrap não acordado, o docusign.js usa os IDs e o host.
        // Esta função backend aqui serve mais para validar e retornar os parâmetros necessários.

        // Vamos simular o retorno dos parâmetros que o docusign.js precisa.
        // A API createHasAgreed (se chamada) já marcaria como concordado.
        // O objetivo aqui é fornecer os parâmetros para o frontend renderizar o clickwrap para o usuário concordar.

        // A URL base do DocuSign (Host) vem de DOCUSIGN_BASE_PATH, mas precisa ser apenas o host.
        // Ex: "https://demo.docusign.net/restapi" -> "https://demo.docusign.net"
        const docusignHost = new URL(DOCUSIGN_BASE_PATH).origin;


        // Aqui, em um cenário real, você poderia verificar se o clickwrapId é válido ou
        // realizar alguma lógica de negócios antes de retornar os parâmetros.
        // A API real para "obter URL para usuário concordar com clickwrap" não é tão direta quanto envelopes.
        // O docusign.js constrói a URL de renderização ele mesmo usando os IDs.

        console.log(`Parâmetros para Clickwrap ${clickwrapId} e clientUserId ${clientUserId} preparados.`);
        return {
            host: docusignHost, // Ex: https://demo.docusign.net
            accountId: DOCUSIGN_ACCOUNT_ID,
            clickwrapId: clickwrapId,
            clientUserId: clientUserId // Reafirma o clientUserId para o frontend
        };
    } catch (error: any) {
        console.error(`Erro ao processar Clickwrap ${clickwrapId}:`, error.response ? error.response.data : error.message);
        throw new Error(`Falha ao processar Clickwrap: ${error.message}`);
    }
}


export const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Corpo da requisição inválido (JSON malformado).' }) };
    }

    const { action, payload } = body;

    if (!action || !payload) {
        return { statusCode: 400, body: JSON.stringify({ error: 'Ação ou payload ausente na requisição.' }) };
    }

    try {
        const apiClient = await getAuthenticatedApiClient();
        let result;

        switch (action) {
            // Ação combinada para envelope e URL de assinatura
            case "CREATE_AND_GET_SIGNING_URL":
                if (!payload.envelopeDefinition || !payload.clientUserId) {
                     return { statusCode: 400, body: JSON.stringify({ error: "Payload inválido para CREATE_AND_GET_SIGNING_URL. Requer 'envelopeDefinition' e 'clientUserId'." }) };
                }
                result = await createAndGetSigningUrl(apiClient, payload);
                break;
            
            // Nova ação para Clickwraps
            case "GET_CLICKWRAP_EMBED_PARAMS":
                if (!payload.clickwrapId || !payload.clientUserId) {
                    return { statusCode: 400, body: JSON.stringify({ error: "Payload inválido para GET_CLICKWRAP_EMBED_PARAMS. Requer 'clickwrapId' e 'clientUserId'." }) };
                }
                result = await getClickwrapEmbedParams(apiClient, payload);
                break;

            // Adicione outras ações se necessário, ou mantenha suas ações antigas se ainda forem usadas separadamente.
            // Exemplo: se você tinha CREATE_DYNAMIC_EMBEDDED_ENVELOPE e GET_EMBEDDED_SIGNING_URL separados.
            // Por simplicidade, combinei para o caso de uso comum de envelope.

            default:
                return { statusCode: 400, body: JSON.stringify({ error: `Ação desconhecida: ${action}` }) };
        }

        return {
            statusCode: 200,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(result),
        };
    } catch (error: any) {
        console.error(`Erro na função Netlify docusign-actions (${action}):`, error.message);
        return {
            statusCode: 500,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ error: error.message || 'Erro interno do servidor ao processar a requisição DocuSign.' }),
        };
    }
};
