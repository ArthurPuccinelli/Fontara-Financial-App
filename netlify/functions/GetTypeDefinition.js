exports.handler = async (event) => {
  try {
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
            isOptional: true,  // Atualizado para opcional
            $class: "concerto.metamodel@1.0.0.IntegerProperty"
          },
          {
            name: "status",
            isArray: false,
            isOptional: true,  // Atualizado para opcional
            $class: "concerto.metamodel@1.0.0.StringProperty"
          },
          {
            name: "dataConsulta",
            isArray: false,
            isOptional: true,  // Atualizado para opcional
            $class: "concerto.metamodel@1.0.0.DateTimeProperty"
          },
          {
            name: "endereco",
            isArray: false,
            isOptional: true,  // Atualizado para opcional
            $class: "concerto.metamodel@1.0.0.StringProperty"
          },
          {
            name: "planoAtual",
            isArray: false,
            isOptional: true,  // Atualizado para opcional
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
      body: JSON.stringify({ declarations: definitions })
    };
  } catch (error) {
    console.error('Erro no GetTypeDefinition:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao gerar definições",
        details: error.message
      })
    };
  }
};
