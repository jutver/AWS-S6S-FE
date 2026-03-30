const awsConfig = {
  Auth: {
    Cognito: {
      userPoolId: "ap-southeast-1_hiLeWHnss",
      userPoolClientId: "1oon5ratv6vb688aom2mhn0ebf",
      loginWith: {
        email: true,
      },
    },
  },
};

export default awsConfig;
