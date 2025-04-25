const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ'); // ajuste se necessário

const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json',
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  try {
    const authHeader = event.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s/, '');

    if (!token) {
      return {
        statusCode: 401,
        body: JSON.stringify({ error: 'Token não fornecido.' }),
      };
    }

    const options = {
      audience: 'https://fontarafinancial.netlify.app',
      issuer: 'https://fontara.us.auth0.com/',
      algorithms: ['RS256'],
    };

    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, getKey, options, (err, decoded) => {
        if (err) reject(err);
        else resolve(decoded);
      });
    });

    // Validação de escopo
    const requiredScope = 'verify:cpfecnpj';
    const scope = decoded.scope || '';
    if (!scope.split(' ').includes(requiredScope)) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'Permissão insuficiente (escopo).' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const clienteId = body?.data?.clienteId;

    if (!clienteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'clienteId não fornecido.' }),
      };
    }

    const resultado = await verificaCPFeCNPJ(clienteId);

    return {
      statusCode: 200,
      body: JSON.stringify(resultado),
    };

  } catch (err) {
    console.error('Erro no verify:', err);
    return {
      statusCode: 403,
      body: JSON.stringify({ error: 'Token inválido, expirado ou erro interno.' }),
    };
  }
};
