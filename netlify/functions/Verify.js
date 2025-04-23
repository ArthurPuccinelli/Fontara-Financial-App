const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    console.log("Recebido:", event);

    const body = JSON.parse(event.body);
    if (!body.data || !body.data.clienteId) {
      throw new Error("clienteId é obrigatório");
    }

    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clienteId: body.data.clienteId,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`Erro ao verificar dados: ${data.error || 'Desconhecido'}`);
    }

    // Convertendo o campo data_consulta para o formato ISO
    return {
      statusCode: 200,
      body: JSON.stringify({
        clienteId: data.cliente_id,
        score: parseInt(data.score), // Garante que o score é um número
        status: data.status,
        dataConsulta: new Date(data.data_consulta).toISOString(), // Garante que dataConsulta seja uma string no formato ISO
        endereco: data.endereco,
        planoAtual: data.plano_atual
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
