const fetch = require('node-fetch');

exports.handler = async () => {
  async function fetchClientData() {
    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ');
    const data = await response.json();
    return data;
  }

  function generateDeclarations(data) {
    const properties = Object.entries(data).map(([key, value]) => {
      let type;
      if (typeof value === 'number') {
        type = 'Integer';
      } else if (Date.parse(value)) {
        type = 'DateTime';
      } else {
        type = 'String';
      }

      return {
        "$class": "Concerto.Property",
        "name": key,
        "type": type,
        "decorators": []
      };
    });

    return [
      {
        "$class": "Concerto.ConceptDeclaration",
        "name": "VerificaCPFeCNPJ",
        "properties": properties,
        "decorators": [],
        "identifier": null,
        "superType": null
      }
    ];
  }

  try {
    const clientData = await fetchClientData();
    const declarations = generateDeclarations(clientData);

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations })
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro ao buscar dados da API', details: error.message })
    };
  }
};
