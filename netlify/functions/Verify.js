exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    // Chamada à função externa
    const data = await verificaCPFeCNPJ(clienteId);

    // Log para depuração
    console.log("Dados retornados pela API:", data);

    // Ajuste da resposta para o formato esperado
    return {
      statusCode: 200,
      body: JSON.stringify({
        typeName: "VerificaCPFeCNPJOutput",
        data: {
          cliente_id: data.clienteId,
          score: data.score,
          status: data.status,
          data_consulta: data.dataConsulta,
          endereco: data.endereco,
          plano_atual: data.planoAtual
        }
      }),
    };
  } catch (error) {
    console.error("Erro:", error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
