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
      console.error('Erro ao obter chave pública do JWKS:', err);
      callback(err);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      console.log('Chave pública obtida com sucesso:', signingKey);
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
        getKey,  // A função getKey é chamada aqui para obter a chave pública
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

    // Logs do escopo
    const scopes = (decoded.scope || '').split(' ');
    console.log('Escopos encontrados no token:', scopes);

    if (!scopes.includes('verify:cpfecnpj')) {
      console.error('Permissão insuficiente. O token não contém o escopo necessário.');
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Permissão insuficiente.' })
      };
    }

    // Parseia o corpo da requisição
    const body = JSON.parse(event.body || '{}');
    console.log('Corpo da requisição:', body);

    // Valida se o clienteId foi fornecido
    if (!body.clienteId) {
      console.error('Erro: O campo clienteId é obrigatório.');
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: 'O campo clienteId é obrigatório.',
        })
      };
    }

    // Chama a função de verificação (substitua com a lógica real)
    console.log('Iniciando a verificação do clienteId:', body.clienteId);
    const resultado = await verificaCPFeCNPJ(body.clienteId);
    console.log('Resultado da verificação:', resultado);

    if (resultado.isValid) {
      console.log('Verificação bem-sucedida, valores válidos.');
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
      console.log('Verificação falhou, valores inválidos.');
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

// Função de exemplo de verificação, substitua com a lógica real
async function verificaCPFeCNPJ(clienteId) {
  console.log('Iniciando verificação de CPF/CNPJ para clienteId:', clienteId);

  // Simulação de resposta da verificação (substitua pela lógica real)
  if (clienteId === 'validClientId') {
    return {
      isValid: true,
      message: 'Cliente validado com sucesso.'
    };
  } else {
    return {
      isValid: false,
      message: 'Falha na validação do cliente.'
    };
  }
}
