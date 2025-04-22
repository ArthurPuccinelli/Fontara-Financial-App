exports.handler = async (event, context) => {
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

  return {
    statusCode: 200,
    body: JSON.stringify({ typeNames }),
    headers: {
      'Content-Type': 'application/json'
    }
  };
};
