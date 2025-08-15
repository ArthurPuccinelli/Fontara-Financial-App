exports.handler = async function(event, context) {
  try {
    // Mesmo se o cliente_id não for passado, agora não vai quebrar mais
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
