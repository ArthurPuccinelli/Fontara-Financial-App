const axios = require('axios');

exports.handler = async function(event, context) {
  try {
    // Pega o clienteId do querystring
    const clienteId = event.queryStringParameters?.cliente_id;

    if (!clienteId) {
      throw new Error('cliente_id não informado');
    }

    // Aqui poderia ter uma chamada real à API se precisar
    // Exemplo omitido porque você disse que o ID vem do usuário
    // Então, vamos devolver campos fixos mesmo.

    const typeNames = [
      { typeName: "clienteId", label: "Cliente Id" },
      { typeName: "score", label: "Score" },
      { typeName: "status", label: "Status" },
      { typeName: "dataConsulta", label: "Data Consulta" },
      { typeName: "endereco", label: "Endereco" },
      { typeName: "planoAtual", label: "Plano Atual" }
    ];

    return {
      statusCode: 200,
      body: JSON.stringify({ typeNames })
    };

  } catch (error) {
    console.error('Erro em GetTypeNames:', error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar tipos' })
    };
  }
};
