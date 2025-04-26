const fetch = require('node-fetch');

// Função auxiliar para converter snake_case → camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

// Função para gerar rótulo legível
function toLabel(str) {
  const camel = toCamelCase(str);
  return camel
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, s => s.toUpperCase())
    .trim();
}

exports.handler = async function(event, context) {
  try {
    const clienteId = '22222222222';

    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJHandler?cliente_id=${clienteId}`);
    const data = await response.json();
    console.log("Resposta da API:", data);

    const typeNames = Object.keys(data).map((key) => {
      const camelKey = toCamelCase(key);
      return {
        typeName: camelKey,
        label: toLabel(key)
      };
    });

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
