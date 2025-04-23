const { verificaCPFeCNPJ } = require('./verificaCPFeCNPJ');
const generateIdempotencyKey = () => 'idempotency-key-' + new Date().toISOString();

exports.handler = async (event) => {
  try {
    const body = JSON.parse(event.body);
    const clienteId = body.data.clienteId;

    // Chamada à função externa
    const data = await verificaCPFeCNPJ(clienteId);

    // Lógica para determinar se a verificação foi bem-sucedida
    const verified = data.score >= 500; // Exemplo: Score maior ou igual a 500 é considerado verificado com sucesso

    const verifyResponseMessage = verified 
      ? "Verificação de dados concluída com sucesso."
      : "Falha na verificação de dados.";

    const verifyFailureReason = !verified 
      ? "O score do cliente é insuficiente para completar a verificação."
      : undefined;

    // Retorno no formato esperado pela API do app terceiro
    return {
      statusCode: 200,
      body: JSON.stringify({
        typeName: "VerificaCPFeCNPJOutput",  // Nome do tipo
        idempotencyKey: generateIdempotencyKey(),  // Garantir a presença de um idempotencyKey
        data: {  // A chave 'data' deve ser usada conforme a documentação
          clienteId: data.clienteId,
          score: data.score,
          status: data.status,
          dataConsulta: data.dataConsulta,  // Certificar-se de que a data está no formato ISO 8601
          endereco: data.endereco,
          planoAtual: data.planoAtual
        }
      }),
    };
  } catch (error) {
    console.error("Erro:", error.message);

    return {
      statusCode: 400,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};
