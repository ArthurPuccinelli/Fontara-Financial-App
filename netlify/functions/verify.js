async function verificaCPFeCNPJ(clienteId) {
  if (!clienteId) {
    throw new Error('O campo clienteId é obrigatório.');
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

  const responseData = {
    clienteId: clienteId, // Retorna diretamente o clienteId como string
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
    verified: true,
    verifyResponseMessage: "Consulta realizada com sucesso.",
    verificationResultCode: "SUCCESS",
    verificationResultDescription: "Verificação concluída com sucesso para o cliente.",
    suggestions, // Incluir as sugestões
    passthroughResponseData: {
      additionalData: "Informações extras podem ser passadas aqui."
    }
  };
}

module.exports = { verificaCPFeCNPJ };
