// netlify/functions/Verify.js

const fetch = require("node-fetch");

async function consultarDadosExternos(clienteId) {
  const url = `https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=${clienteId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Erro ao buscar dados externos: ${response.statusText}`);
  }
  return await response.json();
}

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const { data, idempotencyKey, typeName } = body;

    if (!data || !data.clienteId || !idempotencyKey || !typeName) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          verified: false,
          verifyResponseMessage: "Requisição malformada.",
          verifyFailureReason: "Faltam campos obrigatórios: clienteId, idempotencyKey ou typeName.",
        }),
        headers: { "Content-Type": "application/json" },
      };
    }

    const clienteId = data.clienteId;

    // Chamada real à sua API
    const dados = await consultarDadosExternos(clienteId);

    return {
      statusCode: 200,
      body: JSON.stringify({
        verified: true,
        verifyResponseMessage: "Verificação concluída com sucesso.",
        verificationResultCode: "SUCCESS",
        verificationResultDescription: `Score: ${dados.score}, Plano: ${dados.plano_atual}`,
        suggestions: [
          {
            clienteId: dados.cliente_id,
            score: dados.score,
            status: dados.status,
            dataConsulta: dados.data_consulta,
            endereco: dados.endereco,
            planoAtual: dados.plano_atual,
          },
        ],
      }),
      headers: { "Content-Type": "application/json" },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        verified: false,
        verifyResponseMessage: "Erro na verificação.",
        verifyFailureReason: err.message,
      }),
      headers: { "Content-Type": "application/json" },
    };
  }
};
