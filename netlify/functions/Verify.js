exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    // Chamada à função externa
    const data = await verificaCPFeCNPJ(clienteId);

    // Log para depuração
    console.log("Dados retornados pela API:", data);

    // Lógica para determinar se a verificação foi bem-sucedida
    const verified = data.score >= 500; // Exemplo: Score maior ou igual a 500 é considerado verificado com sucesso

    const verifyResponseMessage = verified 
      ? "Verificação de dados concluída com sucesso."
      : "Falha na verificação de dados.";

    const verifyFailureReason = !verified 
      ? "O score do cliente é insuficiente para completar a verificação."
      : undefined;

    // Retorno no formato esperado pela API do app terceiro
    return {
      statusCode: 200,
      body: JSON.stringify({
        verified,
        verifyResponseMessage,
        verifyFailureReason,
        verificationResultCode: verified ? "SUCCESS" : "FAILURE",
        verificationResultDescription: verified ? "Verificação bem-sucedida." : "Falha na verificação.",
        suggestions: [
          {
            cliente_id: data.clienteId,
            score: data.score,
            status: data.status,
            data_consulta: data.dataConsulta,
            endereco: data.endereco,
            plano_atual: data.planoAtual
          }
        ]
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
