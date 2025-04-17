// netlify/functions/score.js
const data = {
  "usuario123": {
    "score": 785,
    "status": "Bom",
    "data_consulta": "2025-04-17T13:14:00-03:00"
  },
  "usuario456": {
    "score": 620,
    "status": "Regular",
    "data_consulta": "2025-04-17T13:15:00-03:00"
  }
};

exports.handler = async (event, context) => {
  const usuarioId = event.queryStringParameters.usuario_id;

  if (usuarioId && data[usuarioId]) {
    return {
      statusCode: 200,
      body: JSON.stringify({ score: data[usuarioId].score }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  } else {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Usuário não encontrado' }),
      headers: {
        'Content-Type': 'application/json',
      },
    };
  }
};
