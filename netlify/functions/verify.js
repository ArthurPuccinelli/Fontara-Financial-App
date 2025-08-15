const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');

const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
  });
}

exports.handler = async function (event) {
  console.log('Iniciando verificação de token...');

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    console.error('Erro: Token não informado.');
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token não informado.' })
    };
  }

  try {
    console.log('Verificando o token...');

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
          if (err) {
            console.error('Erro ao verificar o token:', err);
            reject(err);
          } else {
            console.log('Token verificado com sucesso:', decoded);
            resolve(decoded);
          }
        }
      );
    });

    const body = JSON.parse(event.body || '{}');
    console.log('Corpo da requisição:', body);

    const { typeName, data } = body;

    if (typeName !== 'VerificacaoDeCliente') { 
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'typeName inválido.' })
      };
    }

    if (!data?.clienteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'O campo clienteId é obrigatório.' })
      };
    }

    const resultadoRaw = await verificaCPFeCNPJ(data.clienteId);

    const resultado = {
      clienteId: String(resultadoRaw.clienteId ?? data.clienteId),
      score: resultadoRaw.score !== undefined ? parseInt(resultadoRaw.score, 10) : null,
      status: resultadoRaw.status ?? null,
      dataConsulta: resultadoRaw.dataConsulta ? new Date(resultadoRaw.dataConsulta).toISOString() : null,
      endereco: resultadoRaw.endereco ?? null,
      planoAtual: resultadoRaw.planoAtual ?? null
    };

    const responseBody = {
      verified: true,
      verifyResponseMessage: "Consulta realizada com sucesso.",
      verificationResultCode: "SUCCESS",
      verificationResultDescription: "Verificação concluída com sucesso para o cliente.",
      suggestions: [resultado],
      passthroughResponseData: {
        additionalData: "Informações extras podem ser passadas aqui."
      }
    };

    console.log('🧪 Corpo da resposta final:', JSON.stringify(responseBody, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify(responseBody)
    };

  } catch (error) {
    console.error('Erro na verificação:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno na verificação.',
        error: error.message
      })
    };
  }
};
