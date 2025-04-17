// netlify/functions/score.js

function gerarScoreAleatorio() {
  return Math.floor(Math.random() * (950 - 300 + 1)) + 300;
}

function gerarStatus(score) {
  if (score >= 700) return "Excelente";
  if (score >= 500) return "Bom";
  if (score >= 300) return "Regular";
  return "Ruim";
}

function gerarDataConsulta() {
  // Retorna a data e hora atual no formato ISO 8601
  return new Date().toISOString();
}

exports.handler = async (event, context) => {
  const clienteId = event.queryStringParameters.cliente_id;

  if (clienteId) {
    const scoreAleatorio = gerarScoreAleatorio();
    const statusAleatorio = gerarStatus(scoreAleatorio);
    const dataConsultaAtual = gerarDataConsulta();

    return {
      statusCode: 200,
      body: JSON.stringify({
        cliente_id: clienteId,
        score: scoreAleatorio,
        status: statusAleatorio,
        data_consulta: dataConsultaAtual,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } else {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'O parâmetro cliente_id é obrigatório.' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
