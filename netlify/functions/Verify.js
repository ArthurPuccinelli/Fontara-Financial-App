const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    // Recebe o input
    const { clienteId } = JSON.parse(event.body);

    if (!clienteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'clienteId é obrigatório' }),
      };
    }

    // Chama sua função externa com o clienteId
    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clienteId }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro da API externa: ${errorText}`);
    }

    const data = await response.json();

    // Monta o output conforme o modelo VerificaCPFeCNPJOutput
    const output = {
      clienteId: data.cliente_id,
      score: data.score,
      status: data.status,
      dataConsulta: data.data_consulta,
      endereco: data.endereco,
      planoAtual: data.plano_atual,
    };

    return {
      statusCode: 200,
      body: JSON.stringify(output),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
