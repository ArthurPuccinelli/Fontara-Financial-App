const fetch = require("node-fetch");

exports.handler = async () => {
  try {
    // Chamada à API com um clienteId fixo de teste
    const response = await fetch("https://fontarafinancial.netlify.app/.netlify/functions/verificaCPFeCNPJ?cliente_id=12345678900");
    const raw = await response.json();

    // A resposta da sua função tem `body` como string JSON → precisamos fazer o parse
    const data = typeof raw.body === "string" ? JSON.parse(raw.body) : raw.body;

    // Função auxiliar para mapear tipo JS → tipo Concerto
    const mapType = (value) => {
      if (typeof value === "string") {
        // Verifica se é DateTime ISO
        return /^\d{4}-\d{2}-\d{2}T/.test(value)
          ? "concerto.metamodel@1.0.0.DateTimeProperty"
          : "concerto.metamodel@1.0.0.StringProperty";
      }
      if (typeof value === "number") return "concerto.metamodel@1.0.0.IntegerProperty";
      if (typeof value === "boolean") return "concerto.metamodel@1.0.0.BooleanProperty";
      return "concerto.metamodel@1.0.0.StringProperty"; // fallback
    };

    const properties = Object.entries(data).map(([key, value]) => ({
      name: key,
      isArray: false,
      isOptional: false,
      $class: mapType(value),
    }));

    const declarations = [
      {
        name: "VerificaCPFeCNPJInput",
        isAbstract: false,
        properties: [
          {
            name: "clienteId",
            isArray: false,
            isOptional: false,
            $class: "concerto.metamodel@1.0.0.StringProperty",
          },
        ],
        identified: {
          name: "clienteId",
          $class: "concerto.metamodel@1.0.0.IdentifiedBy",
        },
        decorators: [],
        $class: "concerto.metamodel@1.0.0.ConceptDeclaration",
      },
      {
        name: "VerificaCPFeCNPJOutput",
        isAbstract: false,
        properties,
        identified: {
          name: "clienteId",
          $class: "concerto.metamodel@1.0.0.IdentifiedBy",
        },
        decorators: [],
        $class: "concerto.metamodel@1.0.0.ConceptDeclaration",
      },
    ];

    return {
      statusCode: 200,
      body: JSON.stringify({ declarations }),
    };
  } catch (error) {
    console.error("Erro no GetTypeDefinition:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Erro ao gerar definições dinâmicas",
        details: error.message,
      }),
    };
  }
};
