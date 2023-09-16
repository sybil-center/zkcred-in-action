# Zero Knowledge Credentials in Action

## Description

This project was created to demonstrate the power of Zero Knowledge Credentials (ZKC).

In the `contracts` folder, you can find a Smart Contract named `ZkcGitHubAccountAuth.ts` which utilizes a Zero-Knowledge Credential to authenticate GitHub account ownership. Once the authentication is completed, the user receives a special token.

In the `ui` folder, you can find a frontend application that communicates with a [test issuer](https://api.dev.sybil.center/documentation) and a deployed Smart Contract on the `Berkeley` Network.

To test the application and go through the main flow, simply follow these steps:

1. Install [Auro Wallet](https://www.aurowallet.com/) (use Berkeley Network)
2. Start frontend application

To start frontend application:

1. Go to the `contracts` folder and execute next command:

```shell
npm run build
```

2. Then got to the `ui` folder and execute command:

```shell
npm run dev
```

?descriptionFromFileType=function+toLocaleUpperCase()+{+[native+code]+}+File&mimeType=application/octet-stream&fileName=Zero+Knowledge+Credentials+in+Action.md&fileType=undefined&fileExtension=md