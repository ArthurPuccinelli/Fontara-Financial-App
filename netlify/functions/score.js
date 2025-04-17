// netlify/functions/score.js

function gerarScoreAleatorio() {
  // Gera um score aleatório entre 300 e 950 (faixa comum de score)
  return Math.floor(Math.random() * (950 - 300 + 1)) + 300;
}

function gerarStatus(score) {
  if (score >= 700) return "Excelente";
  if (score >= 500) return "Bom";
  if (score >= 300) return "Regular";
  return "Ruim";
}

function gerarDataConsulta() {
  // Gera uma data de consulta aleatória nos últimos dias
  const diasAtras = Math.floor(Math.random() * 30); // Até 30 dias atrás
  const data = new Date();
  data.setDate(data.getDate() - diasAtras);
  return data.toISOString();
}

exports.handler = async (event, context) => {
  const clienteId = event.queryStringParameters.cliente_id;

  if (clienteId) {
    const scoreAleatorio = gerarScoreAleatorio();
    const statusAleatorio = gerarStatus(scoreAleatorio);
    const dataConsultaAleatoria = gerarDataConsulta();

    return {
      statusCode: 200,
      body: JSON.stringify({
        cliente_id: clienteId,
        score: scoreAleatorio,
        status: statusAleatorio,
        data_consulta: dataConsultaAleatoria,
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
