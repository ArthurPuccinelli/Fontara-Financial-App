exports.handler = async (event) => {
  let clienteId;

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    clienteId = body.clienteId || (event.queryStringParameters && event.queryStringParameters.cliente_id);
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'Erro ao processar entrada.' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  if (!clienteId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ message: 'O campo clienteId é obrigatório (no body ou query string).' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }

  const score = Math.floor(Math.random() * (950 - 300 + 1)) + 300;
  const status = score >= 700 ? "Excelente" : score >= 500 ? "Bom" : score >= 300 ? "Regular" : "Ruim";
  const data_consulta = new Date().toISOString();
  const enderecos = [
    "Rua das Palmeiras, 123 - São Paulo, SP",
    "Avenida Central, 456 - Belo Horizonte, MG",
    "Travessa das Acácias, 789 - Curitiba, PR",
    "Alameda dos Anjos, 101 - Recife, PE"
  ];
  const endereco = enderecos[parseInt(clienteId) % enderecos.length] || enderecos[0];
  const plano_atual = ["BÁSICO", "INTERMEDIÁRIO", "PREMIUM"][Math.floor(Math.random() * 3)];

  return {
    statusCode: 200,
    body: JSON.stringify({
      cliente_id: clienteId,
      score,
      status,
      data_consulta,
      endereco,
      plano_atual
    }),
    headers: {
      'Content-Type': 'application/json',
    },
  };
};
