const jwt = require('jsonwebtoken'); // Usando CommonJS
const jwksClient = require('jwks-rsa'); // Para obter a chave pública do Auth0

const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json'
});

function getKey(header, callback) {
  console.log('Obtendo chave com header.kid:', header.kid);
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      console.error('Erro ao obter a chave pública:', err);
      callback(err, null);
    } else {
      const signingKey = key.getPublicKey();
      console.log('Chave pública obtida com sucesso:', signingKey);
      callback(null, signingKey);
    }
  });
}

exports.handler = async function (event) {
  console.log('🟡 Iniciando verificação de token...');
  console.log('🔹 Headers recebidos:', event.headers);

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');

  if (!token) {
    console.error('🔴 Erro: Token não informado.');
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token não informado.' })
    };
  }

  try {
    console.log('🔵 Verificando o token...');

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
            console.error('🔴 Erro ao verificar o token:', err);
            reject(err);
          } else {
            console.log('🟢 Token verificado com sucesso:', decoded);
            resolve(decoded);
          }
        }
      );
    });

    // Apenas para teste: logar e retornar o corpo da requisição
    console.log('🔹 Corpo da requisição:', event.body);

    // Aqui você pode seguir com a lógica do modelo, por enquanto retornamos OK
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Token verificado com sucesso.',
        tokenPayload: decoded
      })
    };

  } catch (error) {
    console.error('🔴 Erro na verificação:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno na verificação.',
        error: error.message
      })
    };
  }
};
