exports.handler = async (event, context) => {
  // Aqui você pode buscar os nomes dos tipos de dados do sistema externo, se necessário.
  // Para fins de exemplo, retornaremos um conjunto fixo de tipos.
  
  const typeNames = [
    {
      typeName: "EmailAddress",
      label: "Email Address"
    },
    {
      typeName: "OwnerName",
      label: "Account Owner Name"
    },
    {
      typeName: "Account",
      label: "Account Info"
    }
  ];

  // Retorno com a lista de tipos
  return {
    statusCode: 200,
    body: JSON.stringify({ typeNames }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
