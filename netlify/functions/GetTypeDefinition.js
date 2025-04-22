exports.handler = async () => {
  const definition = {
    typeDefinitions: [
      {
        typeName: "VerificaCPFeCNPJ",
        displayName: "Verificação de CPF e CNPJ",
        description: "Dados retornados pela verificação de CPF e CNPJ",
        properties: [
          {
            name: "cliente_id",
            displayName: "Cliente Id",
            type: "String",
            isRequired: true
          },
          {
            name: "score",
            displayName: "Score",
            type: "Integer",
            isRequired: true
          },
          {
            name: "status",
            displayName: "Status",
            type: "String",
            isRequired: true
          },
          {
            name: "data_consulta",
            displayName: "Data da Consulta",
            type: "DateTime",
            isRequired: true
          },
          {
            name: "endereco",
            displayName: "Endereço",
            type: "String",
            isRequired: true
          },
          {
            name: "plano_atual",
            displayName: "Plano Atual",
            type: "String",
            isRequired: true
          }
        ]
      }
    ]
  };

  return {
    statusCode: 200,
    body: JSON.stringify(definition)
  };
};
