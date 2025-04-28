async function verificaCPFeCNPJ(clienteId) {
  if (!clienteId) {
    throw new Error('O campo clienteId é obrigatório.');
  }

  const score = Math.floor(Math.random() * (950 - 300 + 1)) + 300;
  const status = score >= 700 ? "Excelente" : score >= 500 ? "Bom" : "Regular";
  const dataConsulta = new Date().toISOString();
  const enderecos = [
    "Rua das Palmeiras, 123 - São Paulo, SP",
    "Avenida Central, 456 - Belo Horizonte, MG",
    "Travessa das Acácias, 789 - Curitiba, PR",
    "Alameda dos Anjos, 101 - Recife, PE"
  ];
  const endereco = enderecos[parseInt(clienteId) % enderecos.length] || enderecos[0];
  const planoAtual = ["BÁSICO", "INTERMEDIÁRIO", "PREMIUM"][Math.floor(Math.random() * 3)];

  return {
    clienteId,
    score,
    status,
    dataConsulta,
    endereco,
    planoAtual
  };
}

module.exports = { verificaCPFeCNPJ };
