const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// Crie o cliente JWKS para buscar a chave pública do Auth0
const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json'  // URL do JWKS do Auth0
});

// Função para pegar a chave pública
function getKey(header, callback) {
  client.getSigningKey(header.kid, function(err, key) {
    if (err) {
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);
    }
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
        getKey,  // A função getKey é chamada aqui para obter a chave pública
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

    if (resultado.isValid) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: true,
          verifyResponseMessage: "Transfer verification completed.",
          verificationResultCode: "SUCCESS",
          verificationResultDescription: "Transaction confirmation: W63427."
        })
      };
    } else {
      return {
        statusCode: 200,
        body: JSON.stringify({
          verified: false,
          verifyResponseMessage: "Verification failed.",
          verifyFailureReason: "The account has no position in the supplied source fund. It has a position in the suggested fund. Please verify again.",
          verificationResultCode: "VERIFICATION_ERRORS",
          suggestions: [
            {
              account_num: "123456789",
              source_fund: "Corporate Bond Fund",
              destination_fund: "Growth Stock Fund",
              balance: 10000.00,
              transfer_date: "2025-03-05T00:00:00.000Z",
              prospectus: true,
              typeOfAccount: "brokerage",
              email: "sally.signer@email.com",
              ownername: "Sally Signer"
            }
          ]
        })
      };
    }
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
