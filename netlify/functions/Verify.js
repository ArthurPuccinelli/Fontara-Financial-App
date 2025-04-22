// netlify/functions/Verify.js

function verificarDados(data) {
  const { clienteId } = data;

  if (!clienteId || clienteId.length < 11) {
    return {
      verified: false,
      verifyResponseMessage: "Dados inválidos.",
      verifyFailureReason: "O campo clienteId é obrigatório e deve conter pelo menos 11 caracteres.",
      verificationResultCode: "INVALID_INPUT",
      verificationResultDescription: "clienteId incompleto ou ausente."
    };
  }

  const score = Math.floor(Math.random() * 650) + 300;
  const status = score >= 700 ? "Excelente" : score >= 500 ? "Bom" : "Regular";

  return {
    verified: true,
    verifyResponseMessage: "Dados verificados com sucesso.",
    verificationResultCode: "SUCCESS",
    verificationResultDescription: `Score ${score} - Status ${status}`,
    suggestions: [
      {
        clienteId: clienteId,
        score: score,
        status: status,
        dataConsulta: new Date().toISOString(),
        endereco: "Rua das Palmeiras, 123 - São Paulo, SP",
        planoAtual: "INTERMEDIÁRIO"
      }
    ]
  };
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { data, idempotencyKey, typeName } = body;

    if (!data || !idempotencyKey || !typeName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          verified: false,
          verifyResponseMessage: "Campos obrigatórios ausentes na requisição.",
          verifyFailureReason: "Faltam data, idempotencyKey ou typeName."
        }),
        headers: { 'Content-Type': 'application/json' }
      };
    }

    const result = verificarDados(data);

    return {
      statusCode: 200,
      body: JSON.stringify(result),
      headers: { 'Content-Type': 'application/json' }
    };

  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        verified: false,
        verifyResponseMessage: "Erro interno ao processar a verificação.",
        verifyFailureReason: err.message
      }),
      headers: { 'Content-Type': 'application/json' }
    };
  }
};
