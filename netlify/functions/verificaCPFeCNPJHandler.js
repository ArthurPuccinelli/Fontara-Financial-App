// netlify/functions/verificaCPFeCNPJHandler.js
const { verificaCPFeCNPJ } = require("./verificaCPFeCNPJ");

exports.handler = async (event) => {
  try {
    const clienteId = event.queryStringParameters?.cliente_id;
    const data = verificaCPFeCNPJ(clienteId);

    return {
      statusCode: 200,
      body: JSON.stringify(data),
      headers: { 'Content-Type': 'application/json' }
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
