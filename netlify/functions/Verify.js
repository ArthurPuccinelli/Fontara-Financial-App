const { verificaCPFeCNPJ } = require("./verificaCPFeCNPJ");

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    // Chamada à função externa
    const data = await verificaCPFeCNPJ(clienteId);

    // Log para depuração
    console.log("Dados retornados pela API:", data);

    return {
      statusCode: 200,
      body: JSON.stringify({
        "@type": "VerificaCPFeCNPJOutput", // ✅ necessário para validação Concerto
        clienteId: data.clienteId,
        score: data.score,
        status: data.status,
        dataConsulta: data.dataConsulta,
        endereco: data.endereco,
        planoAtual: data.planoAtual
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
