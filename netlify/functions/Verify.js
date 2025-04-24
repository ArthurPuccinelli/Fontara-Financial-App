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
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Token de autorização ausente ou inválido');
    }

    const token = authHeader.split(' ')[1];

    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: AUTH0_AUDIENCE,
          issuer: `https://${AUTH0_DOMAIN}/`,
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) return reject(err);
          resolve(decoded);
        }
      );
    });

    // Verifica se o escopo "verify" está presente
    if (!decoded.scope || !decoded.scope.includes('verify')) {
      throw new Error('Token não tem permissão (scope) necessária: verify');
    }

    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    const data = await verificaCPFeCNPJ(clienteId);

    const verified = data.score >= 500;

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
