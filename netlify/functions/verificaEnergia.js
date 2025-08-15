/**
 * Simula a verificação de dados de energia para um cliente.
 * Em um cenário real, aqui seria feita uma chamada a um serviço externo (ex: API da companhia elétrica).
 *
 * @param {string} clienteId - O CPF ou CNPJ do cliente a ser verificado.
 * @returns {Promise<object>} Um objeto com os dados do cliente no formato do Concept 'VerificacaoEnergia'.
 */
async function verificaEnergia(clienteId) {
  // Simulação de uma chamada assíncrona (ex: a um banco de dados ou API)
  await new Promise(resolve => setTimeout(resolve, 50)); // Simula latência de rede

  // Dados mockados para a demonstração
  const dadosSimulados = {
    clienteId: clienteId, // Retorna o mesmo ID que foi passado como entrada
    nome: "Maria Souza",
    endereco: "Rua das Flores, 123 - Centro - Curitiba/PR",
    telefone: "(41) 99999-9999",
    unidadeConsumidora: "UC-456789"
  };

  console.log(`[verificaEnergia] Verificação simulada para clienteId: ${clienteId}`);

  return dadosSimulados;
}

module.exports = { verificaEnergia };
