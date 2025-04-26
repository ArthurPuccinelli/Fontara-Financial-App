// netlify/functions/verificaCPFeCNPJ.js

const fetch = require('node-fetch');

// Função para verificar e retornar os dados do cliente
exports.handler = async (event) => {
  try {
    const { clienteId } = JSON.parse(event.body); // Extrai o clienteId do corpo da requisição
    if (!clienteId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "clienteId é obrigatório" })
      };
    }

    // Simulação de dados retornados com base no clienteId
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

    const responseData = {
      clienteId: clienteId,
      score,
      status,
      dataConsulta: data_consulta,
      endereco,
      planoAtual: plano_atual
    };

    // Gerando sugestões para autofill
    const suggestions = [{
      clienteId: responseData.clienteId,
      score: responseData.score,
      status: responseData.status,
      dataConsulta: responseData.dataConsulta,
      endereco: responseData.endereco,
      planoAtual: responseData.planoAtual
    }];

    // Retorna a resposta conforme esperado pelo DocuSign
    return {
      statusCode: 200,
      body: JSON.stringify({
        verified: true,
        verifyResponseMessage: "Consulta realizada com sucesso.",
        verificationResultCode: "SUCCESS",
        verificationResultDescription: "Verificação concluída com sucesso para o cliente.",
        suggestions, // Incluir sugestões para autofill
        passthroughResponseData: {
          additionalData: "Informações extras podem ser passadas aqui."
        }
      })
    };

  } catch (error) {
    console.error('Erro ao processar a requisição:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno do servidor', details: error.message })
    };
  }
};
