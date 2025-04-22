const fetch = require('node-fetch');

// Simula a busca de tipos do sistema externo
async function fetchClientData(clienteId) {
  const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=${clienteId}`);
  const data = await response.json();
  return data;
}

// Converte para declaração Concerto (sem valores)
function convertToConcertoFormat() {
  return [{
    "name": "VerificaCPFeCNPJOutput",
    "$class": "concerto.metamodel@1.0.0.ConceptDeclaration",
    "decorators": [],
    "identified": {
      "name": "clienteId",
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
  }];
}

// Função principal para obter os tipos em formato Concerto
async function getTypeDefinitions(clienteId) {
  await fetchClientData(clienteId); // apenas para simular o acesso
  const concertoFormat = convertToConcertoFormat();
  console.log(JSON.stringify(concertoFormat, null, 2));
}

// Exemplo de uso
getTypeDefinitions('11111111111');
