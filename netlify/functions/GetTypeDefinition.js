// netlify/functions/GetTypeDefinition.js
const fs = require('fs');
const path = require('path');

exports.handler = async function(event, context) {
  const { typeName } = event.queryStringParameters || {};

  if (!typeName) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'O parâmetro typeName é obrigatório.' })
    };
  }

  try {
    // Carrega o modelo CTO completo
    const modelPath = path.join(__dirname, 'model.cto');
    const ctoContent = fs.readFileSync(modelPath, 'utf8');
    const model = JSON.parse(ctoContent);

    // Encontra a definição do conceito (declaration) para o typeName especificado
    const conceptDeclaration = model.declarations.find(d => d.name === typeName);

    if (!conceptDeclaration) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `A definição para o tipo '${typeName}' não foi encontrada.` })
      };
    }

    // Retorna a definição encontrada
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json'
      },
      // A resposta deve conter um array 'declarations'
      body: JSON.stringify({ declarations: [conceptDeclaration] })
    };

  } catch (error) {
    console.error(`Erro ao processar a definição para ${typeName}:`, error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Erro interno ao buscar a definição do tipo.' })
    };
  }
};
