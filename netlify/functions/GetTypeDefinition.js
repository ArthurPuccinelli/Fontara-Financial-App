exports.handler = async (event) => {
  try {
    const definitions = [
      {
        "$class": "concerto.metamodel@1.0.0.ConceptDeclaration",
        "name": "VerificaCPFeCNPJInput",
        "decorators": [
          {
            "$class": "concerto.metamodel@1.0.0.Decorator",
            "name": "VerifiableType",
            "arguments": []
          }
        ],
        "properties": [
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "clienteId",
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "IsRequiredForVerifyingType",
                "arguments": []
              }
            ]
          }
        ],
        "identifiedBy": "clienteId"
      },
      {
        "$class": "concerto.metamodel@1.0.0.ConceptDeclaration",
        "name": "VerificaCPFeCNPJOutput",
        "decorators": [
          {
            "$class": "concerto.metamodel@1.0.0.Decorator",
            "name": "VerifiableType",
            "arguments": []
          }
        ],
        "properties": [
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "clienteId",
            "decorators": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.IntegerProperty",
            "name": "score",
            "decorators": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "status",
            "decorators": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.DateTimeProperty",
            "name": "dataConsulta",
            "decorators": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "endereco",
            "decorators": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "planoAtual",
            "decorators": []
          }
        ],
        "identifiedBy": "clienteId"
      }
    ];

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations: definitions })
    };

  } catch (error) {
    console.error('❌ Erro no GetTypeDefinition:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao gerar definições dinamicamente.",
        details: error.message
      })
    };
  }
};
