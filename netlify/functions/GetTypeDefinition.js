const fetch = require('node-fetch');

exports.handler = async () => {
  try {
    // Cliente de exemplo
    const clienteId = '22222222222';

    // Chamada à função HTTP correta
    const response = await fetch(`https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJHandler?cliente_id=${clienteId}`);
    const data = await response.json();
    console.log("Dados retornados pela API:", data);

    // Gerar definições de tipo dinamicamente a partir das chaves do objeto retornado
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
        properties: Object.keys(data).map(key => {
          let propertyType;
          if (typeof data[key] === 'string') {
            propertyType = "concerto.metamodel@1.0.0.StringProperty";
          } else if (typeof data[key] === 'number') {
            propertyType = "concerto.metamodel@1.0.0.IntegerProperty";
          } else if (key === 'dataConsulta') {
            propertyType = "concerto.metamodel@1.0.0.DateTimeProperty";
          }

          return {
            name: key.charAt(0).toUpperCase() + key.slice(1),
            isArray: false,
            isOptional: false,
            $class: propertyType
          };
        }),
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
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao buscar dados ou gerar definições",
        details: error.message
      })
    };
  }
};
