const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');

const AUTH0_DOMAIN = 'fontara.us.auth0.com';
const AUTH0_AUDIENCE = 'https://fontarafinancial.netlify.app';

const client = jwksClient({
  jwksUri: `https://${AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error("❌ Erro ao obter chave de assinatura:", err);
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.handler = async (event) => {
  try {
    console.log("🔍 Iniciando a verificação do token...");

    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error("❌ Token de autorização ausente ou inválido.");
      throw new Error('Token de autorização ausente ou inválido');
    }

    const token = authHeader.split(' ')[1];
    console.log("🔑 Token recebido:", token);

    // 🔧 Comentado o trecho que validaria o JWT:
    // const decoded = await new Promise((resolve, reject) => {
    //   jwt.verify(
    //     token,
    //     getKey,
    //     {
    //       audience: AUTH0_AUDIENCE,
    //       issuer: `https://${AUTH0_DOMAIN}/`,
    //       algorithms: ['RS256']
    //     },
    //     (err, decoded) => {
    //       if (err) {
    //         console.error("❌ Erro ao verificar token:", err);
    //         return reject(err);
    //       }
    //       console.log("✅ Token decodificado:", decoded);
    //       resolve(decoded);
    //     }
    //   );
    // });

    // ✅ Simulação do
