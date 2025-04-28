exports.handler = async (event) => {
  try {
    const definitions = [
      {
        name: "VerificacaoDeCliente",
        isAbstract: false,
        properties: [
          {
            name: "clienteId",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty",
            decorators: [
              { $class: "concerto.metamodel@1.0.0.Decorator", name: "IsRequiredForVerifyingType" },
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Informe o CPF ou CNPJ" }
                ]
              }
            ]
          },
          {
            name: "score",
            isArray: false,
            isOptional: true,
            $class: "concerto.metamodel@1.0.0.IntegerProperty",
            decorators: [
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Score" }
                ]
              }
            ]
          },
          {
            name: "status",
            isArray: false,
            isOptional: true,
            $class: "concerto.metamodel@1.0.0.StringProperty",
            decorators: [
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Status" }
                ]
              }
            ]
          },
          {
            name: "dataConsulta",
            isArray: false,
            isOptional: true,
            $class: "concerto.metamodel@1.0.0.DateTimeProperty",
            decorators: [
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Data da consulta" }
                ]
              }
            ]
          },
          {
            name: "endereco",
            isArray: false,
            isOptional: true,
            $class: "concerto.metamodel@1.0.0.StringProperty",
            decorators: [
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Endereço" }
                ]
              }
            ]
          },
          {
            name: "planoAtual",
            isArray: false,
            isOptional: true,
            $class: "concerto.metamodel@1.0.0.StringProperty",
            decorators: [
              {
                $class: "concerto.metamodel@1.0.0.Decorator",
                name: "Term",
                arguments: [
                  { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Plano atual" }
                ]
              }
            ]
          }
        ],
        identified: {
          name: "clienteId",
          $class: "concerto.metamodel@1.0.0.IdentifiedBy"
        },
        decorators: [
          { $class: "concerto.metamodel@1.0.0.Decorator", name: "VerifiableType" },
          {
            $class: "concerto.metamodel@1.0.0.Decorator",
            name: "Term",
            arguments: [
              { $class: "concerto.metamodel@1.0.0.DecoratorString", value: "Verificação de cliente" }
            ]
          }
        ],
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
