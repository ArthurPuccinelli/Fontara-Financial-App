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
          payload: {
            declarations: [
              {
                name: 'VerificaCPFeCNPJInput',
                isAbstract: false,
                properties: [
                  {
                    name: 'clienteId',
                    isArray: false,
                    isOptional: false,
                    $class: 'concerto.metamodel@1.0.0.StringProperty'
                  }
                ],
                identified: {
                  name: 'clienteId',
                  $class: 'concerto.metamodel@1.0.0.IdentifiedBy'
                },
                decorators: [],
                $class: 'concerto.metamodel@1.0.0.ConceptDeclaration'
              }
            ]
          }
        })
      };
    }

    // Chamando a função de verificação
    const resultado = await verificaCPFeCNPJ(body.clienteId);

    // Estrutura a resposta conforme o modelo Concerto
    const resposta = {
      "$class": "VerificaCPFeCNPJOutput",
      "clienteId": resultado.clienteId, // clienteId como string, não como objeto
      "score": resultado.score,         // IntegerProperty
      "status": resultado.status,       // StringProperty
      "dataConsulta": resultado.dataConsulta, // DateTimeProperty
      "endereco": resultado.endereco,   // StringProperty
      "planoAtual": resultado.planoAtual // StringProperty
    };

    console.log('Resultado da verificação CPFeCNPJ (Concerto):', JSON.stringify(resposta, null, 2));

    // Retorne a resposta no formato esperado
    return {
      statusCode: 200,
      body: JSON.stringify({
        payload: {
          declarations: [
            {
              name: 'VerificaCPFeCNPJOutput',
              isAbstract: false,
              properties: [
                {
                  name: 'clienteId',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.StringProperty'
                },
                {
                  name: 'score',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.IntegerProperty'
                },
                {
                  name: 'status',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.StringProperty'
                },
                {
                  name: 'dataConsulta',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.DateTimeProperty'
                },
                {
                  name: 'endereco',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.StringProperty'
                },
                {
                  name: 'planoAtual',
                  isArray: false,
                  isOptional: false,
                  $class: 'concerto.metamodel@1.0.0.StringProperty'
                }
              ],
              identified: {
                name: 'clienteId',
                $class: 'concerto.metamodel@1.0.0.IdentifiedBy'
              },
              decorators: [],
              $class: 'concerto.metamodel@1.0.0.ConceptDeclaration'
            }
          ]
        },
        response: resposta
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
