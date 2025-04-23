const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Cliente de exemplo
    const clienteId = '22222222222';

    // Chamada à função HTTP correta
    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJHandler?cliente_id=${clienteId}`);
    const data = await response.json();

    // Gerar typeNames dinamicamente a partir das chaves retornadas pela API
    const typeNames = Object.keys(data).map((key) => ({
      typeName: key.charAt(0).toUpperCase() + key.slice(1),
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
