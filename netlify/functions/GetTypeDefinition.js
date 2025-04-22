const fetch = require('node-fetch');

exports.handler = async () => {
  try {
    const response = await fetch('https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ');
    const data = await response.json();

    const declarations = [
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
        properties: [
          {
            name: "clienteId",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty"
          },
          {
            name: "score",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.IntegerProperty"
          },
          {
            name: "status",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty"
          },
          {
            name: "dataConsulta",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.DateTimeProperty"
          },
          {
            name: "endereco",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty"
          },
          {
            name: "planoAtual",
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
      }
    ];

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations })
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
