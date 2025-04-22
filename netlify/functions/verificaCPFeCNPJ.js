// netlify/functions/verificaCPFeCNPJ.js

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
  return new Date().toISOString();
}

function gerarEnderecoFicticio(clienteId) {
  const enderecos = [
    "Rua das Palmeiras, 123 - São Paulo, SP",
    "Avenida Central, 456 - Belo Horizonte, MG",
    "Travessa das Acácias, 789 - Curitiba, PR",
    "Alameda dos Anjos, 101 - Recife, PE"
  ];
  return enderecos[parseInt(clienteId) % enderecos.length] || enderecos[0];
}

function gerarPlanoAleatorio() {
  const planos = ["BÁSICO", "INTERMEDIÁRIO", "PREMIUM"];
  return planos[Math.floor(Math.random() * planos.length)];
}

exports.handler = async (event, context) => {
  const clienteId = event.queryStringParameters.cliente_id;

  if (clienteId) {
    const scoreAleatorio = gerarScoreAleatorio();
    const statusAleatorio = gerarStatus(scoreAleatorio);
    const dataConsultaAtual = gerarDataConsulta();
    const endereco = gerarEnderecoFicticio(clienteId);
    const planoAtual = gerarPlanoAleatorio();

    return {
      statusCode: 200,
      body: JSON.stringify({
        cliente_id: clienteId,
        score: scoreAleatorio,
        status: statusAleatorio,
        data_consulta: dataConsultaAtual,
        endereco: endereco,
        plano_atual: planoAtual
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
