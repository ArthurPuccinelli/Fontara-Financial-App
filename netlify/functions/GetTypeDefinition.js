const fetch = require('node-fetch');

// Função para buscar os tipos do sistema externo
async function fetchClientData(clienteId) {
  const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=${clienteId}`);
  const data = await response.json();
  return data; // Retorna os dados gerados pela API externa
}

// Função para converter os dados em formato Concerto
function convertToConcertoFormat(data) {
  const concertoType = {
    "name": "VerificaCPFeCNPJOutput",  // Nome do tipo
    "$class": "concerto.metamodel@1.0.0.ConceptDeclaration",
    "decorators": [],
    "identified": {
      "name": "cliente_id",  // Identificador único do cliente
      "$class": "concerto.metamodel@1.0.0.IdentifiedBy"
    },
    "isAbstract": false,
    "properties": [
      {
        "name": "clienteId",
        "$class": "concerto.metamodel@1.0.0.StringProperty",
        "isArray": false,
        "isOptional": false
      },
      {
        "name": "score",
        "$class": "concerto.metamodel@1.0.0.IntegerProperty",
        "isArray": false,
        "isOptional": false
      },
      {
        "name": "status",
        "$class": "concerto.metamodel@1.0.0.StringProperty",
        "isArray": false,
        "isOptional": false
      },
      {
        "name": "dataConsulta",
        "$class": "concerto.metamodel@1.0.0.DateTimeProperty",
        "isArray": false,
        "isOptional": false
      },
      {
        "name": "endereco",
        "$class": "concerto.metamodel@1.0.0.StringProperty",
        "isArray": false,
        "isOptional": false
      },
      {
        "name": "planoAtual",
        "$class": "concerto.metamodel@1.0.0.StringProperty",
        "isArray": false,
        "isOptional": false
      }
    ]
  };

  // Preenche as propriedades com os dados recebidos
  concertoType.properties.forEach(prop => {
    prop.value = data[prop.name];  // Preenche as propriedades com os valores correspondentes
  });

  return concertoType;
}

// Função principal para obter os tipos e convertê-los
async function getTypeDefinitions(clienteId) {
  const clientData = await fetchClientData(clienteId);
  const concertoFormat = convertToConcertoFormat(clientData);
  
  console.log(JSON.stringify(concertoFormat, null, 2));
}

// Exemplo de uso com cliente_id 11111111111
getTypeDefinitions('11111111111');
