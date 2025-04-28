const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    const clienteId = '22222222222';

    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJHandler?cliente_id=${clienteId}`);
    const data = await response.json();
    console.log("Resposta da API:", data);

    const typeNames = Object.keys(data).map((key) => ({
      typeName: key,
      label: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ typeNames })
    };
  } catch (error) {
    console.error('Erro no GetTypeNames:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar tipos' })
    };
  }
};
