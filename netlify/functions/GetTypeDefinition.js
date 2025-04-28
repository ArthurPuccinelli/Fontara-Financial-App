const fetch = require('node-fetch');

// Função auxiliar para converter snake_case → camelCase
function toCamelCase(str) {
  return str.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
}

exports.handler = async () => {
  try {
    const clienteId = '22222222222';

    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJHandler?cliente_id=${clienteId}`);
    const data = await response.json();
    console.log("Dados retornados pela API:", data);

    const outputProperties = Object.entries(data).map(([key, value]) => {
      let propertyType;
      if (typeof value === 'string') {
        if (toCamelCase(key) === 'dataConsulta') {
          propertyType = 'concerto.metamodel@1.0.0.DateTimeProperty';
        } else {
          propertyType = 'concerto.metamodel@1.0.0.StringProperty';
        }
      } else if (typeof value === 'number') {
        propertyType = 'concerto.metamodel@1.0.0.IntegerProperty';
      }

      if (!propertyType) return null;

      return {
        name: toCamelCase(key),
        isArray: false,
        isOptional: false,
        $class: propertyType
      };
    }).filter(Boolean);

    const definitions = [
      {
        name: "VerificaCPFeCNPJInput",
        isAbstract: false,
        properties: [
          {
            name: "clienteId",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty"
          }
        ],
        identified: {
          name: "clienteId",
          $class: "concerto.metamodel@1.0.0.IdentifiedBy"
        },
        decorators: [],
        $class: "concerto.metamodel@1.0.0.ConceptDeclaration"
      },
      {
        name: "VerificaCPFeCNPJOutput",
        isAbstract: false,
        properties: outputProperties,
        identified: {
          name: "clienteId",
          $class: "concerto.metamodel@1.0.0.IdentifiedBy"
        },
        decorators: [],
        $class: "concerto.metamodel@1.0.0.ConceptDeclaration"
      }
    ];

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations: definitions })
    };
  } catch (error) {
    console.error('Erro no GetTypeDefinition:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao buscar dados ou gerar definições",
        details: error.message
      })
    };
  }
};
