const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');

exports.handler = async (event) => {
  try {
    let clienteId = event.queryStringParameters?.cliente_id || '22222222222';

    if (!clienteId || isNaN(clienteId)) {
      throw new Error('cliente_id inválido.');
    }

    const data = await verificaCPFeCNPJ(clienteId);

    console.log("Dados retornados pelo verificaCPFeCNPJ:", data);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (error) {
    console.error("Erro na handler:", error);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
