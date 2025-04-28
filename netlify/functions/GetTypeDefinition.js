// netlify/functions/GetTypeDefinition.js

// Importa módulos nativos do Node.js
const fs = require('fs');
const path = require('path');

exports.handler = async (event) => {
  try {
    // 📄 Define o caminho absoluto para o arquivo model.cto
    const modelPath = path.join(__dirname, 'model.cto');

    // 📚 Lê o conteúdo do model.cto como string
    const modelContent = fs.readFileSync(modelPath, 'utf-8');

    // 🔎 Faz o parse do conteúdo do model.cto (esperado em formato JSON)
    const modelJson = JSON.parse(modelContent);

    // ✅ Valida que o objeto tem a propriedade 'declarations' e que é um array
    if (!modelJson.declarations || !Array.isArray(modelJson.declarations)) {
      throw new Error("Formato inválido no model.cto: chave 'declarations' ausente ou incorreta.");
    }

    const definitions = modelJson.declarations;

    // 🚀 Retorna as definições carregadas diretamente do arquivo
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
