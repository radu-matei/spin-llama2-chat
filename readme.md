# Spin and OpenAI

This is a sample Spin application written in TypeScript that uses the OpenAI
JavaScript client library to communicate with OpenAI.

![Demo](./demo.gif)

### Running from GitHub

```
# export your OpenAI key as an environment variable when running locally.
$  export SPIN_CONFIG_OPENAI_KEY=sk-*******
$ spin up -f spin up -f ghcr.io/radu-matei/spin-chatgpt:v1
  api: http://127.0.0.1:3000/api (wildcard)
  web: http://127.0.0.1:3000 (wildcard)
  kv-explorer: http://127.0.0.1:3000/internal/kv-explorer (wildcard)
```

### Building and running

Prerequisites:

- [Spin](https://developer.fermyon.com/spin)
- [the Spin JavaScript toolchain](https://developer.fermyon.com/spin/javascript-components)
- [NPM](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- an [OpenAI API key](https://openai.com/blog/openai-api)

Once you have configured Spin and the JavaScript toolchain locally, install the
dependencies for the API component:

```
$ cd api && npm install
```

Now, you can build the application and run it locally with Spin:

```bash
$ spin build
# export your OpenAI key as an environment variable when running locally.
$  export SPIN_CONFIG_OPENAI_KEY=sk-*******
$ spin up
Serving http://127.0.0.1:3000
Available Routes:
  api: http://127.0.0.1:3000/api (wildcard)
  web: http://127.0.0.1:3000 (wildcard)
  kv-explorer: http://127.0.0.1:3000/internal/kv-explorer (wildcard)
```

The OpenAI client is based on the [work done by Eric Lewis](https://github.com/ericlewis/openai-node),
modified to use the `fetch` API.

### Deploying to Fermyon Cloud

```bash
$ spin deploy --variable openai_key=$SPIN_CONFIG_OPENAI_KEY
Uploading chatgpt version 0.1.0+r43dbc47c...
Deploying...
Waiting for application to become ready..... ready
Available Routes:
  web: https://spin-chatgpt.fermyon.app (wildcard)
  api: https://spin-chatgpt.fermyon.app/api (wildcard)
  kv-explorer: https://spin-chatgpt.fermyon.app/internal/kv-explorer (wildcard)
```
