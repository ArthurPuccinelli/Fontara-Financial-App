// frontend/scripts/insights.js
document.addEventListener('DOMContentLoaded', () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  const errorMessageContainer = document.getElementById('error-message');
  const errorDetails = document.getElementById('error-details');
  const dashboardContent = document.getElementById('dashboard-content');
  const chartCanvas = document.getElementById('contractsChart');
  const dataTableBody = document.getElementById('dataTableBody');

  let contractsChart = null; // Para manter a referência do gráfico

  // Função para formatar números como moeda brasileira
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Função para renderizar o gráfico
  const renderChart = (data) => {
    if (!chartCanvas) return;
    
    // Destrói o gráfico anterior, se existir, para evitar sobreposição
    if (contractsChart) {
      contractsChart.destroy();
    }

    const labels = data.map(item => item.mes);
    const contractCounts = data.map(item => item.contratos);

    contractsChart = new Chart(chartCanvas, {
      type: 'bar', // Tipo de gráfico: barras
      data: {
        labels: labels,
        datasets: [{
          label: 'Nº de Contratos',
          data: contractCounts,
          backgroundColor: '#00ab63', // Verde Fontara
          borderColor: '#00894e',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false, // Esconde a legenda, pois o título do card já é claro
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.dataset.label}: ${context.parsed.y}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
                stepSize: 5 // Define o intervalo do eixo Y
            }
          }
        }
      }
    });
  };

  // Função para renderizar a tabela
  const renderTable = (data) => {
    if (!dataTableBody) return;
    dataTableBody.innerHTML = ''; // Limpa a tabela antes de preencher

    if (data.length === 0) {
        dataTableBody.innerHTML = '<tr><td colspan="3" class="tw-p-3 tw-text-center">Nenhum dado disponível.</td></tr>';
        return;
    }

    data.forEach(item => {
      const row = document.createElement('tr');
      row.classList.add('tw-border-b', 'dark:tw-border-gray-700', 'hover:tw-bg-gray-50', 'dark:hover:tw-bg-gray-800');
      
      row.innerHTML = `
        <td class="tw-p-3">${item.mes}</td>
        <td class="tw-p-3">${item.contratos}</td>
        <td class="tw-p-3">${formatCurrency(item.valor_total)}</td>
      `;
      dataTableBody.appendChild(row);
    });
  };

  // Função principal para buscar e exibir os dados
  const loadDashboardData = async () => {
    loadingIndicator.classList.remove('tw-hidden');
    errorMessageContainer.classList.add('tw-hidden');
    dashboardContent.classList.add('tw-hidden');

    try {
      const response = await fetch('/.netlify/functions/navigator-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'get-dashboard-data', payload: {} }), // Payload pode ser usado para filtros futuros
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ details: response.statusText }));
        throw new Error(errorData.details || `Erro HTTP ${response.status}`);
      }

      const data = await response.json();
      
      if (data && data.results) {
        renderChart(data.results);
        renderTable(data.results);
        dashboardContent.classList.remove('tw-hidden');
      } else {
        throw new Error("Formato de dados inesperado recebido da API.");
      }

    } catch (error) {
      console.error("Erro ao carregar dados do dashboard:", error);
      errorDetails.textContent = error.message;
      errorMessageContainer.classList.remove('tw-hidden');
    } finally {
      loadingIndicator.classList.add('tw-hidden');
    }
  };

  // Inicia o carregamento dos dados
  loadDashboardData();
});
