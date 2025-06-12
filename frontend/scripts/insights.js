// frontend/scripts/insights.js
document.addEventListener('DOMContentLoaded', () => {
  // Elementos da UI
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessageContainer = document.getElementById('error-message');
  const errorDetails = document.getElementById('error-details');
  const dashboardContent = document.getElementById('dashboard-content');
  const refreshDataBtn = document.getElementById('refreshDataBtn');

  // Elementos para exibir dados
  const totalAgreementsEl = document.getElementById('totalAgreements');
  const agreementTypesEl = document.getElementById('agreementTypes');
  const lastAgreementDateEl = document.getElementById('lastAgreementDate');
  const dataTableBody = document.getElementById('dataTableBody');

  /**
   * Formata uma string de data (ISO) para o formato brasileiro.
   * @param {string} isoDate - A data em formato ISO (ex: "2025-06-10T10:00:00Z").
   * @returns {string} A data formatada (ex: "10/06/2025").
   */
  const formatDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    try {
      return new Date(isoDate).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch (e) {
      return 'Data inválida';
    }
  };

  /**
   * Atualiza a UI com os dados recebidos da API.
   * @param {Array<object>} agreements - A lista de acordos.
   */
  const updateUI = (agreements) => {
    if (!agreements) agreements = [];

    // 1. Atualiza os cards de resumo
    totalAgreementsEl.textContent = agreements.length;

    const uniqueTypes = new Set(agreements.map(a => a.type).filter(Boolean));
    agreementTypesEl.textContent = uniqueTypes.size;

    // Ordena para encontrar o mais recente
    const sortedAgreements = agreements.sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate));
    const latestAgreement = sortedAgreements[0];
    lastAgreementDateEl.textContent = latestAgreement ? formatDate(latestAgreement.effectiveDate) : 'N/A';
    
    // 2. Preenche a tabela
    dataTableBody.innerHTML = ''; 
    if (agreements.length === 0) {
      dataTableBody.innerHTML = '<tr><td colspan="4" class="tw-p-3 tw-text-center">Nenhum acordo encontrado. Verifique se a Navigator API está habilitada e se a extração de dados foi concluída.</td></tr>';
      return;
    }

    agreements.slice(0, 10).forEach(agreement => { // Mostra apenas os 10 mais recentes
      const row = document.createElement('tr');
      row.className = 'tw-border-b dark:tw-border-gray-700 hover:tw-bg-gray-50 dark:hover:tw-bg-gray-800';
      row.innerHTML = `
        <td class="tw-p-3">${agreement.title || 'Sem Título'}</td>
        <td class="tw-p-3">${agreement.type || 'N/A'}</td>
        <td class="tw-p-3">${formatDate(agreement.effectiveDate)}</td>
        <td class="tw-p-3"><span class="tw-px-2 tw-py-1 tw-text-xs tw-font-medium tw-rounded-full tw-bg-green-100 tw-text-green-800 dark:tw-bg-green-900 dark:tw-text-green-300">${agreement.status || 'N/A'}</span></td>
      `;
      dataTableBody.appendChild(row);
    });
  };

  /**
   * Controla a visibilidade dos elementos da UI com base no estado.
   * @param {'loading' | 'error' | 'success'} state 
   */
  const showUIState = (state) => {
      if (loadingIndicator) loadingIndicator.style.display = state === 'loading' ? 'block' : 'none';
      if (errorMessageContainer) errorMessageContainer.style.display = state === 'error' ? 'block' : 'none';
      if (dashboardContent) dashboardContent.style.display = state === 'success' ? 'block' : 'none';
  };

  /**
   * Função principal para buscar e exibir os dados dos acordos.
   */
  const loadAgreementsData = async () => {
    showUIState('loading');

    try {
      const response = await fetch('/.netlify/functions/navigator-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-agreements-list' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.details || `Erro HTTP ${response.status}`);
      }
      
      // A API Navigator real (e a nossa de exemplo) retorna os dados em uma propriedade 'value'
      updateUI(data.value);
      showUIState('success');

    } catch (error) {
      console.error("Erro ao carregar dados do painel:", error);
      if (errorDetails) errorDetails.textContent = error.message;
      showUIState('error');
    }
  };

  if(refreshDataBtn) {
    refreshDataBtn.addEventListener('click', loadAgreementsData);
  }

  // Inicia o carregamento dos dados quando a página é carregada
  loadAgreementsData();
});
