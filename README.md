# Zero Knowledge Credentials in Action

## Description

Project was created to show you power of the Zero Knowledge Credential (ZKC).

In `contracts` folder you can see Smart Contract `ZkcGitHubAccountAuth.ts` which use Github account ownership zero-knowledge credential to authenticate end use, when authentication is done user receive special token.

In `ui` folder you can see frontend application which communicate with [test issuer](https://api.dev.sybil.center/documentation), and deployed Smart Contract on `Berkeley` Network.

To test application and feel main flow just do simple steps:

1. Install [Auro Wallet](https://www.aurowallet.com/) (use Berkeley Network)
2. Start frontend application

To start application:

1. Go to the `contracts` folder and execute next command:

```shell
npm run build
```

2. Then got to the `ui` folder and execute command:

```shell
npm run dev
```

?descriptionFromFileType=function+toLocaleUpperCase()+{+[native+code]+}+File&mimeType=application/octet-stream&fileName=Zero+Knowledge+Credentials+in+Action.md&fileType=undefined&fileExtension=md