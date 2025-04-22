exports.handler = async function () {
  const typeDefinition = `
namespace Verify.Version2.VerificaCPFeCNPJ

concept VerificaCPFeCNPJ {
  o String cliente_id
  o Integer score
  o String status
  o DateTime data_consulta
  o String endereco
  o String plano_atual
}
  `;

  return {
    statusCode: 200,
    body: JSON.stringify({
      typeDefinitions: [typeDefinition]
    })
  };
};
