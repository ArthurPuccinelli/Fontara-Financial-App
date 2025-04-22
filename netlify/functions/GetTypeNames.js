// netlify/functions/GetTypeNames.js

exports.handler = async (event, context) => {
  const typeNames = [
    {
      typeName: "VerificaCPFeCNPJInput",
      label: "Verificação de CPF e CNPJ (Entrada)",
      description: "Dados de entrada para verificar informações de CPF ou CNPJ"
    },
    {
      typeName: "VerificaCPFeCNPJOutput",
      label: "Verificação de CPF e CNPJ (Resultado)",
      description: "Resultado da verificação com score, status e outros dados"
    }
  ];

  return {
    statusCode: 200,
    body: JSON.stringify({ typeNames }),
    headers: {
      'Content-Type': 'application/json',
    }
  };
};
