const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');
const generateIdempotencyKey = () => 'idempotency-key-' + new Date().toISOString();

exports.handler = async (event) => {
  try {
    console.log("🔍 Evento recebido:", event);

    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    console.log("📨 clienteId recebido:", clienteId);

    // Chamada à função externa
    const data = await verificaCPFeCNPJ(clienteId);

    console.log("📦 Dados retornados pela API verificaCPFeCNPJ:", data);

    const verified = data.score >= 500;

    const responsePayload = {
      verified: verified,
      verifyResponseMessage: verified
        ? "Verificação de dados concluída com sucesso."
        : "Falha na verificação de dados.",
      ...(verified
        ? {}
        : {
            verifyFailureReason:
              "O score do cliente é insuficiente para completar a verificação.",
          }),
      verificationResultCode: verified ? "SUCCESS" : "LOW_SCORE",
      verificationResultDescription: `Score retornado: ${data.score}`,
      suggestions: [
        {
          clienteId: data.clienteId,
          score: data.score,
          status: data.status,
          dataConsulta: data.dataConsulta,
          endereco: data.endereco,
          planoAtual: data.planoAtual,
        },
      ],
    };

    console.log("📤 Payload de resposta que será enviado:", responsePayload);

    return {
      statusCode: 200,
      body: JSON.stringify(responsePayload),
    };
  } catch (error) {
    console.error("❌ Erro na verificação:", error);

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
      }),
    };
  }
};
