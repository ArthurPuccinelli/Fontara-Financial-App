const fetch = require('node-fetch');

exports.handler = async (event) => {
  try {
    // Verificar se a entrada está no formato correto
    console.log("Recebido:", event);

    // Validar o tipo de entrada
    if (!event.data || !event.data.clienteId) {
      throw new Error("clienteId é obrigatório");
    }

    // Chamar a API para verificar os dados do cliente (simulando uma API externa)
    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        clienteId: event.data.clienteId,
      }),
    });

    const data = await response.json();

    // Verificar a resposta da API
    if (!response.ok) {
      throw new Error(`Erro ao verificar dados: ${data.error || 'Desconhecido'}`);
    }

    // Retornar a resposta com os dados
    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Dados verificados com sucesso',
        data: data,
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
