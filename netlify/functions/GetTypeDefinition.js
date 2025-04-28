exports.handler = async (event) => {
  try {
    const definitions = [
      {
        "$class": "concerto.metamodel@1.0.0.ConceptDeclaration",
        "name": "VerificacaoDeCliente",
        "isAbstract": false,
        "decorators": [
          {
            "$class": "concerto.metamodel@1.0.0.Decorator",
            "name": "VerifiableType",
            "arguments": []
          },
          {
            "$class": "concerto.metamodel@1.0.0.Decorator",
            "name": "Term",
            "arguments": [
              {
                "$class": "concerto.metamodel@1.0.0.DecoratorString",
                "value": "Verificação de cliente"
              }
            ]
          }
        ],
        "properties": [
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "clienteId",
            "isArray": false,
            "isOptional": false,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "IsRequiredForVerifyingType",
                "arguments": []
              },
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Informe o CPF ou CNPJ"
                  }
                ]
              }
            ]
          },
          {
            "$class": "concerto.metamodel@1.0.0.IntegerProperty",
            "name": "score",
            "isArray": false,
            "isOptional": true,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Score"
                  }
                ]
              }
            ]
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "status",
            "isArray": false,
            "isOptional": true,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Status"
                  }
                ]
              }
            ]
          },
          {
            "$class": "concerto.metamodel@1.0.0.DateTimeProperty",
            "name": "dataConsulta",
            "isArray": false,
            "isOptional": true,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Data da consulta"
                  }
                ]
              }
            ]
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "endereco",
            "isArray": false,
            "isOptional": true,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Endereço"
                  }
                ]
              }
            ]
          },
          {
            "$class": "concerto.metamodel@1.0.0.StringProperty",
            "name": "planoAtual",
            "isArray": false,
            "isOptional": true,
            "decorators": [
              {
                "$class": "concerto.metamodel@1.0.0.Decorator",
                "name": "Term",
                "arguments": [
                  {
                    "$class": "concerto.metamodel@1.0.0.DecoratorString",
                    "value": "Plano atual"
                  }
                ]
              }
            ]
          }
        ],
        "identified": {
          "$class": "concerto.metamodel@1.0.0.IdentifiedBy",
          "name": "clienteId"
        }
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
