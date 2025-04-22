const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // Chamada à sua API com um cliente_id de exemplo (pode ser fixo ou parametrizável)
    const clienteId = '22222222222';
    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=${clienteId}`);
    const data = await response.json();

    // Gerar typeNames dinamicamente a partir das chaves do objeto retornado
    const typeNames = Object.keys(data).map((key) => ({
      typeName: key.charAt(0).toUpperCase() + key.slice(1),
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
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
