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
  console.log('Início da execução da função verify');  // Log de entrada na função

  const authHeader = event.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  console.log('Token extraído do cabeçalho:', token);  // Log para verificar o token recebido

  if (!token) {
    console.error('Token não informado.');  // Log de erro
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token não informado.' })
    };
  }

  try {
    console.log('Iniciando a verificação do token...');  // Log para indicar o início da verificação do token
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
            console.error('Erro na verificação do token:', err);  // Log de erro na verificação do token
            reject(err);
          } else {
            console.log('Token verificado com sucesso:', decoded);  // Log de sucesso na verificação
            resolve(decoded);
          }
        }
      );
    });

    const scopes = (decoded.scope || '').split(' ');
    console.log('Escopos encontrados no token:', scopes);  // Log para verificar os escopos

    if (!scopes.includes('verify:cpfecnpj')) {
      console.error('Permissão insuficiente para acessar o recurso "verify:cpfecnpj"');  // Log de erro
      return {
        statusCode: 403,
        body: JSON.stringify({ message: 'Permissão insuficiente.' })
      };
    }

    // Agora você deve parsear o corpo da requisição antes de usá-lo
    const body = JSON.parse(event.body || '{}');
    console.log('Body da requisição:', body);  // Log do corpo da requisição

    console.log('Iniciando a verificação de CPFeCNPJ...');  // Log para indicar o início da verificação
    const resultado = await verificaCPFeCNPJ(body.data);

    console.log('Resultado da verificação CPFeCNPJ:', resultado);  // Log do resultado da verificação

    return {
      statusCode: 200,
      body: JSON.stringify(resultado)
    };
  } catch (error) {
    console.error('Erro na execução da função verify:', error);  // Log de erro geral
    return {
      statusCode: 401,
      body: JSON.stringify({ message: 'Token inválido ou erro na verificação.', error: error.message })
    };
  }
};
