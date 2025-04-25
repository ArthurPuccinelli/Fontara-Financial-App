const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');

const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async function (event) {
  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token não informado.' })
    };
  }

  try {
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,
        getKey,
        {
          audience: 'https://fontarafinancial.netlify.app',
          issuer: 'https://fontara.us.auth0.com/',
          algorithms: ['RS256']
        },
        (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        }
      );
    });

    const scopes = (decoded.scope || '').split(' ');
    if (!scopes.includes('verify:cpfecnpj')) {
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Permissão insuficiente.' })
      };
    }

    // Parseia o body da requisição
    const body = JSON.parse(event.body || '{}');
    const resultado = await verificaCPFeCNPJ(body.data);

    return {
      statusCode: 200,
      body: JSON.stringify(resultado)
    };
  } catch (error) {
    console.error('Erro na verificação:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token inválido ou erro na verificação.', error: error.message })
    };
  }
};
