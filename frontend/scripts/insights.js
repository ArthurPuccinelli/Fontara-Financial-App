// frontend/scripts/insights.js
document.addEventListener('DOMContentLoaded', () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessageContainer = document.getElementById('error-message');
  const errorDetails = document.getElementById('error-details');
  const dashboardContent = document.getElementById('dashboard-content');
  const chartCanvas = document.getElementById('contractsChart');
  const dataTableBody = document.getElementById('dataTableBody');
  const refreshDataBtn = document.getElementById('refreshDataBtn');

  let contractsChart = null; // Para manter a referência do gráfico

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const renderChart = (data) => {
    if (!chartCanvas) return;
    if (contractsChart) contractsChart.destroy();

    const labels = data.map(item => item.mes);
    const contractCounts = data.map(item => item.contratos);

    contractsChart = new Chart(chartCanvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de Contratos',
          data: contractCounts,
          backgroundColor: 'rgba(0, 171, 99, 0.6)',
          borderColor: 'rgba(0, 137, 78, 1)',
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#111827',
            titleColor: '#ffffff',
            bodyColor: '#ffffff',
            callbacks: {
              label: (context) => `${context.dataset.label}: ${context.parsed.y}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { 
                stepSize: 10,
                color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#4b5563'
            },
            grid: { color: document.documentElement.classList.contains('dark') ? '#374151' : '#e5e7eb' }
          },
          x: {
            ticks: { color: document.documentElement.classList.contains('dark') ? '#9ca3af' : '#4b5563' },
            grid: { display: false }
          }
        }
      }
    });
  };

  const renderTable = (data) => {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = ''; 

    if (data.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" class="tw-p-3 tw-text-center">Nenhum dado disponível.</td></tr>';
        return;
    }

    data.forEach(item => {
      const row = document.createElement('tr');
      row.className = 'tw-border-b dark:tw-border-gray-700 hover:tw-bg-gray-50 dark:hover:tw-bg-gray-800';
      row.innerHTML = `
        <td class="tw-p-3">${item.mes}</td>
        <td class="tw-p-3">${item.contratos}</td>
        <td class="tw-p-3">${formatCurrency(item.valor_total)}</td>
      `;
      dataTableBody.appendChild(row);
    });
  };

  const showUIState = (state) => {
      loadingIndicator.style.display = state === 'loading' ? 'block' : 'none';
      errorMessageContainer.style.display = state === 'error' ? 'block' : 'none';
      dashboardContent.style.display = state === 'success' ? 'block' : 'none';
  };

  const loadDashboardData = async () => {
    showUIState('loading');

    try {
      const response = await fetch('/.netlify/functions/navigator-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-dashboard-data' }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: response.statusText }));
        throw new Error(errorData.details || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.results) {
        renderChart(data.results);
        renderTable(data.results);
        showUIState('success');
      } else {
        throw new Error("Formato de dados inesperado recebido da API.");
      }

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      errorDetails.textContent = error.message;
      showUIState('error');
    }
  };

  if(refreshDataBtn) {
    refreshDataBtn.addEventListener('click', loadDashboardData);
  }

  // Inicia o carregamento dos dados quando a página é carregada
  loadDashboardData();
});
