const jwt = require('jsonwebtoken');  // Usando require, pois estamos no CommonJS
const jwksClient = require('jwks-rsa');  // Para pegar a chave pública do Auth0

const client = jwksClient({
  jwksUri: 'https://fontara.us.auth0.com/.well-known/jwks.json'  // URL de descoberta do Auth0
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      callback(err, null);
    } else {
      const signingKey = key.publicKey || key.rsaPublicKey;
      callback(null, signingKey);  // Passa a chave pública para a verificação
    }
  });
}

exports.handler = async function (event) {
  console.log('Iniciando verificação de token...');

  const authHeader = event.headers.authorization || '';  // Obtém o cabeçalho de autorização
  const token = authHeader.replace('Bearer ', '');  // Remove 'Bearer ' para obter o token puro

  if (!token) {
    console.error('Erro: Token não informado.');
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token não informado.' })
    };
  }

  try {
    console.log('Verificando o token...');

    // Verificação do JWT
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(
        token,  // Token recebido na requisição
        getKey,  // Função que retorna a chave pública
        {
          audience: 'https://fontarafinancial.netlify.app',  // O seu audience (app)
          issuer: 'https://fontara.us.auth0.com/',  // O issuer (Auth0)
          algorithms: ['RS256']  // Algoritmo de verificação
        },
        (err, decoded) => {
          if (err) {
            console.error('Erro ao verificar o token:', err);  // Log de erro na verificação
            reject(err);  // Retorna o erro
          } else {
            console.log('Token verificado com sucesso:', decoded);  // Log do conteúdo do token
            resolve(decoded);  // Retorna o conteúdo do token
          }
        }
      );
    });

    // Aqui você pode adicionar a lógica de verificação do seu modelo (verificaCPFeCNPJ) etc.

  } catch (error) {
    console.error('Erro na verificação:', error);  // Log do erro
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Erro interno na verificação.',
        error: error.message  // Detalha o erro para depuração
      })
    };
  }
};
