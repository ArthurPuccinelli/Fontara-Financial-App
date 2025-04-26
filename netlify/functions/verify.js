// Verifica se o evento tem body e converte-o corretamente
async function handler(event) {
  let clienteId;

  // Se o corpo da requisição for uma string, tenta fazer o parse
  if (event.body) {
    try {
      const parsedBody = JSON.parse(event.body);
      clienteId = parsedBody.clienteId;
    } catch (error) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: "Erro ao processar o corpo da requisição" })
      };
    }
  }

  // Verifica se o clienteId foi passado corretamente
  if (!clienteId) {
    throw new Error('O campo clienteId é obrigatório.');
  }

  // A lógica do cálculo do score e dados continua aqui
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

  return {
    statusCode: 200,
    body: JSON.stringify({
      verified: true,
      verifyResponseMessage: "Consulta realizada com sucesso.",
      verificationResultCode: "SUCCESS",
      verificationResultDescription: "Verificação concluída com sucesso para o cliente.",
      suggestions, // Incluir as sugestões para autofill
      passthroughResponseData: {
        additionalData: "Informações extras podem ser passadas aqui."
      }
    })
  };
}

module.exports = { handler };
