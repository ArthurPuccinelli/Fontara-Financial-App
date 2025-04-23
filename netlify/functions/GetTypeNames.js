const fetch = require('node-fetch');

exports.handler = async function(event, context) {
  try {
    // ID de teste para simular uma consulta
    const clienteId = '22222222222';

    // Chamada à função verificaCPFeCNPJ
    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=${clienteId}`);
    const raw = await response.json();

    // Verifica se o campo `body` existe e faz o parse
    const data = typeof raw.body === 'string' ? JSON.parse(raw.body) : raw;

    // Gera os nomes dos tipos com base nas chaves do objeto
    const typeNames = Object.keys(data).map((key) => ({
      typeName: key.charAt(0).toUpperCase() + key.slice(1),
      label: key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
    }));

    return {
      statusCode: 200,
      body: JSON.stringify({ typeNames }),
    };
  } catch (error) {
    console.error('Erro no GetTypeNames:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar tipos' }),
    };
  }
};
