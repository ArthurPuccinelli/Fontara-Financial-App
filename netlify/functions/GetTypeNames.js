// netlify/functions/GetTypeNames.js

exports.handler = async function(event, context) {
  // Este endpoint deve retornar os 'tipos' de verificação que sua integração suporta.
  // Cada tipo corresponde a um 'Concept' no seu modelo Concerto (model.cto).
  const types = [
    {
      name: "VerificacaoDeCliente", // Nome do Concept no model.cto
      label: "Fontara BR Financial"  // Rótulo amigável que aparecerá no DocuSign
    },
    {
      name: "VerificacaoEnergia",
      label: "Fontara Energia"
    }
  ];

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ types })
  };
};
