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

    // Parseia o corpo da requisição
    const body = JSON.parse(event.body || '{}');

    // Valida se o clienteId foi fornecido
    if (!body.clienteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'O campo clienteId é obrigatório.',
        })
      };
    }

    // Chamando a função de verificação
    const resultado = await verificaCPFeCNPJ(body.clienteId);

    // Estrutura a resposta conforme o modelo Concerto
    const resposta = {
      "$class": "VerificaCPFeCNPJOutput",
      "clienteId": String(resultado.clienteId), // clienteId como string, não como objeto
      "score": resultado.score,         // IntegerProperty
      "status": resultado.status,       // StringProperty
      "dataConsulta": resultado.dataConsulta, // DateTimeProperty
      "endereco": resultado.endereco,   // StringProperty
      "planoAtual": resultado.planoAtual // StringProperty
    };

    console.log('Resultado da verificação CPFeCNPJ (Concerto):', JSON.stringify(resposta, null, 2));

    // Retorne a resposta no formato esperado pelo Connected Fields
    return {
      statusCode: 200,
      body: JSON.stringify({
        verified: true,  // Se a verificação for bem-sucedida
        verifyResponseMessage: "Verificação completada com sucesso.",
        verificationResultCode: "SUCCESS",
        verificationResultDescription: "Verificação realizada com sucesso para o cliente: " + resultado.clienteId,
        suggestions: [
          {
            "$class": "VerificaCPFeCNPJOutput",
            "clienteId": String(resultado.clienteId),
            "score": resultado.score,
            "status": resultado.status,
            "dataConsulta": resultado.dataConsulta,
            "endereco": resultado.endereco,
            "planoAtual": resultado.planoAtual
          }
        ]
      })
    };
  } catch (error) {
    console.error('Erro na verificação:', error);
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token inválido ou erro na verificação.', error: error.message })
    };
  }
};
