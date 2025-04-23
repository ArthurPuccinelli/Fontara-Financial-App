const { verificaCPFeCNPJ } = require("./verificaCPFeCNPJ");

module.exports = async function (event, context, callback) {
  try {
    const body = typeof event.data === "string" ? JSON.parse(event.data) : event.data;
    const clienteId = body.clienteId;

    const data = await verificaCPFeCNPJ(clienteId);

    const output = {
      $class: "Verify.Version2.VerificaCPFeCNPJOutput",
      clienteId: data.cliente_id,
      score: data.score,
      status: data.status,
      dataConsulta: data.data_consulta,
      endereco: data.endereco,
      planoAtual: data.plano_atual,
    };

    return callback(null, output);
  } catch (error) {
    console.error("Erro:", error.message);
    return callback(error);
  }
};
