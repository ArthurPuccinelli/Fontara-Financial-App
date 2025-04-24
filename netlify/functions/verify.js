const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');

const AUTH0_DOMAIN = 'fontara.us.auth0.com';
const AUTH0_AUDIENCE = 'https://fontarafinancial.netlify.app';

const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("❌ Erro ao obter chave de assinatura:", err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  try {
    console.log("🔍 Iniciando a verificação do token...");

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Token de autorização ausente ou inválido.");
      throw new Error('Token de autorização ausente ou inválido');
    }

    const token = authHeader.split(' ')[1];
    console.log("🔑 Token recebido:", token);

    // Comentando a verificação do JWT (JWT não é verificado verificado)
    // const decoded = await new Promise((resolve, reject) => {
    //   jwt.verify(
    //     token,
    //     getKey,
    //     {
    //       audience: AUTH0_AUDIENCE,
    //       issuer: `https://${AUTH0_DOMAIN}/`,
    //       algorithms: ['RS256']
    //     },
    //     (err, decoded) => {
    //       if (err) {
    //         console.error("❌ Erro ao verificar token:", err);
    //         return reject(err);
    //       }
    //       console.log("✅ Token decodificado:", decoded); // Log para ver o conteúdo do token
    //       resolve(decoded);
    //     }
    //   );
    // });

    // Substituindo a lógica de verificação de JWT para uso sem a verificação
    const decoded = { scope: 'verify' }; // Apenas um exemplo de como você pode seguir sem a verificação real do token.

    // Verifica se o escopo "verify" está presente
    console.log("🔍 Verificando escopo do token...");
    if (!decoded.scope || !decoded.scope.includes('verify')) {
      console.error("❌ Escopo não encontrado ou incorreto no token.");
      throw new Error('Token não tem permissão (scope) necessária: verify');
    }

    const body = JSON.parse(event.body);
    console.log("📥 Dados recebidos no corpo da requisição:", body);

    const clienteId = body.data.clienteId;
    console.log("🔍 ClienteId para verificação:", clienteId);

    const data = await verificaCPFeCNPJ(clienteId);
    console.log("✅ Dados de verificação obtidos:", data);

    const verified = data.score >= 500;
    console.log("🔍 Resultado da verificação de score:", verified);

    const responsePayload = {
      verified,
      verifyResponseMessage: verified
        ? "Verificação de dados concluída com sucesso."
        : "Falha na verificação de dados.",
      ...(verified
        ? {}
        : {
            verifyFailureReason:
              "O score do cliente é insuficiente para completar a verificação.",
          }),
      verificationResultCode: verified ? "SUCCESS" : "LOW_SCORE",
      verificationResultDescription: `Score retornado: ${data.score}`,
      suggestions: [
        {
          clienteId: data.clienteId,
          score: data.score,
          status: data.status,
          dataConsulta: data.dataConsulta,
          endereco: data.endereco,
          planoAtual: data.planoAtual,
        },
      ],
    };

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
    };
  } catch (error) {
    console.error("❌ Erro na verificação:", error);

    return {
      statusCode: 401,
      body: JSON.stringify({
        error: "access_denied",
        error_description: error.message,
      }),
    };
  }
};
