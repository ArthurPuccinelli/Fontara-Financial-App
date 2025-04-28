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

// Função auxiliar para converter snake_case → camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
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

    console.log('Escopos encontrados no token:', decoded.scope?.split(' '));

    const body = JSON.parse(event.body || '{}');
    console.log('Corpo da requisição:', body);

    const { typeName, idempotencyKey, data } = body;

    if (typeName !== 'VerificaCPFeCNPJInput') {
      console.error('typeName inválido:', typeName);
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'typeName inválido.' })
      };
    }

    if (!data?.clienteId) {
      console.error('Erro: clienteId ausente ou inválido.');
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'O campo clienteId é obrigatório.' })
      };
    }

    console.log('Chamando verificaCPFeCNPJ com clienteId:', data.clienteId);

    const resultadoRaw = await verificaCPFeCNPJ(data.clienteId);
    console.log('Resultado bruto de verificaCPFeCNPJ:', resultadoRaw);

    // Força os tipos corretos no formato esperado pelo schema Concerto
    const resultado = {
      clienteId: String(resultadoRaw.clienteId ?? data.clienteId),
      score: parseInt(resultadoRaw.score) || 0,
      status: String(resultadoRaw.status || ''),
      dataConsulta: new Date(resultadoRaw.dataConsulta || Date.now()).toISOString(),
      endereco: String(resultadoRaw.endereco || ''),
      planoAtual: String(resultadoRaw.planoAtual || '')
    };

    // Estrutura da resposta conforme o formato esperado pela ação "Verify"
    const responseBody = {
      verified: true, // Indica que a verificação foi bem-sucedida
      verifyResponseMessage: "Consulta realizada com sucesso.",
      verificationResultCode: "SUCCESS", // Código de sucesso
      verificationResultDescription: "Verificação concluída com sucesso para o cliente.",
      suggestions: [
        {
          clienteId: resultado.clienteId,
          score: resultado.score,
          status: resultado.status,
          dataConsulta: resultado.dataConsulta,
          endereco: resultado.endereco,
          planoAtual: resultado.planoAtual
        }
      ],
      passthroughResponseData: {
        // Aqui você pode incluir dados adicionais, caso necessário.
        // Exemplo: Dados de auditoria ou metadados
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
