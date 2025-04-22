const fetch = require('node-fetch');

exports.handler = async () => {
  // Função para buscar os dados da sua API
  async function fetchClientData() {
    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ');
    const data = await response.json();
    return data;
  }

  // Função para mapear as propriedades e gerar as definições de tipo
  function generateDeclarations(data) {
    const properties = Object.keys(data).map(key => {
      const type = typeof data[key] === 'number' ? 'Integer' :
                   typeof data[key] === 'string' ? 'String' :
                   'DateTime';  // Supondo que a data seja uma string com formato datetime

      // Ajustando a declaração para ser compatível com os tipos esperados
      return {
        name: key,
        type: type,  // Tipo esperado, como 'String', 'Integer', ou 'DateTime'
        required: true,
        description: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),  // Display-friendly name
        displayName: key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' '),  // Display-friendly name
      };
    });

    return [
      {
        typeName: "VerificaCPFeCNPJ",
        displayName: "Verificação de CPF e CNPJ",
        description: "Dados retornados pela verificação de CPF e CNPJ",
        declarations: properties  // Aqui estamos retornando a estrutura corrigida
      }
    ];
  }

  try {
    // Buscar os dados da API
    const clientData = await fetchClientData();
    const declarations = generateDeclarations(clientData);

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations })  // Resposta com a estrutura "declarations"
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar dados da API', details: error.message })
    };
  }
};
