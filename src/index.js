'use strict';

const fs = require('fs');
const http = require('http');
const https = require('https');
const path = require('path');

const httpPort = parseInt(process.argv[2], 10);
const httpsPort = parseInt(process.argv[3], 10);

/**
 * Redirect all requests for `w3c-test.org` and `not-w3c-test.org` (including
 * subdomains) to the equivalent location on `web-platform-tests.live` and
 * `not-web-platform-tests.live`, respectively.
 */
const onRequest = (protocol, request, response) => {
  const { method, url, httpVersion, headers } = request;

  console.log(method + ' ' + url + ' HTTP/' + httpVersion);
  for (const name in headers) {
    console.log(name + ': ' + headers[name]);
  }
  console.log();

  if (/\/\.well-known\/acme-challenge/.test(url)) {
    serveFile(request, response);
    return;
  }

  const host = request.headers.host
    .replace('w3c-test.org', 'web-platform-tests.live');
  const location = protocol + '://' + host + request.url;
  response.statusCode = 307;
  response.setHeader('Location', location);
  response.end();
};

const serveFile = (request, response) => {
  const filename = path.join(process.cwd(), path.resolve('/', request.url));

  fs.readFile(filename, 'utf-8', (err, contents) => {
    if (err) {
      response.statusCode = 500;
      response.end(err.message);
      return;
    }

    response.statusCode = 200;
    response.end(contents);
  });
};

const onListening = (protocol) => {
  console.log(protocol + ' server online');
};

const onError = (protocol, error) => {
  console.error(protocol + ' server error: ' + error.message);
  process.exit(1);
};

http.createServer(onRequest.bind(null, 'http'))
  .listen(httpPort)
  .on('listening', onListening.bind(null, 'http'))
  .on('error', onError.bind(null, 'http'));
 
https.createServer(onRequest.bind(null, 'https'))
  .listen(httpsPort)
  .on('listening', onListening.bind(null, 'https'))
  .on('error', onError.bind(null, 'https'));
