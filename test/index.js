'use strict';

const assert = require('assert');
const fs = require('fs');
const http = require('http');
const https = require('https');
const net = require('net');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');
const { promisify } = require('util');

const mkdir = promisify(fs.mkdir);
const mkdtemp = promisify(fs.mkdtemp);
const rimraf = promisify(require('rimraf'));
const writeFile = promisify(fs.writeFile);

const get = (url) => {
  return new Promise((resolve, reject) => {
      http.get(url, resolve)
        .on('error', reject);
    })
    .then((response) => {
      if (response.statusCode >= 300) {
        return response;
      }

      response.body = '';
      response.on('data', (chunk) => response.body += chunk);
      return new Promise((resolve, reject) => {
        response.on('end', () => resolve(response));
        response.on('error', reject);
      });
    });
};

const retry = {};
const waitForPort = (port, cancelWhen) => {
  return Promise.race([
      get('http://localhost:' + port).catch(() => retry),
      cancelWhen
    ])
    .then((result) => {
        if (result === retry) {
          return waitForPort(port, cancelWhen);
        }

        return result;
      });
};

const _startServer = async (httpPort, httpsPort) => {
  const prefix = os.tmpdir() + path.sep + 'redirector';
  const dirname = await mkdtemp(prefix);
  await mkdir(path.join(dirname, '.well-known'));
  await mkdir(path.join(dirname, '.well-known', 'acme-challenge'));

  const args = [
    path.join(__dirname, '..', 'files', 'redirector', 'server.js'),
    httpPort,
    httpsPort
  ];
  const child = spawn('node', args, { cwd: dirname });
  const kill = async () => {
    if (child.killed) {
      return;
    }

    child.kill();

    return new Promise((resolve) => {
        child.on('close', () => resolve());
      });
  };

  const onClose = new Promise((_, reject) => {
    child.on('close', () => reject(new Error('child closed early')));
  });
  
  try {
    await waitForPort(httpPort, onClose);
    return { kill, dirname };
  } catch (error) {
    await rimraf(dirname);
    throw error;
  }
};

setup(async function() {
  this.test.ctx._servers = [];

  this.test.ctx.startServer = async (...args) => {
    const server = await _startServer(...args);
    this.test.ctx._servers.push(server);
    return server;
  };
});

teardown(async function() {
  await Promise.all(this.test.ctx._servers.map(({ kill }) => kill()));

  await Promise.all(
    this.test.ctx._servers.map(({ dirname }) => rimraf(dirname))
  );
});

test('redirects HTTP traffic', async function() {
  let response;
  await this.startServer(8000, 9001);

  response = await get('http://w3c-test.org');
  assert.equal(response.statusCode, 307);
  assert.equal(response.headers.location, 'http://web-platform-tests.live/');

  response = await get('http://w3c-test.org/path?query');
  assert.equal(response.statusCode, 307);
  assert.equal(
    response.headers.location, 'http://web-platform-tests.live/path?query'
  );

  response = await get('http://www.w3c-test.org');
  assert.equal(response.statusCode, 307);
  assert.equal(
    response.headers.location, 'http://www.web-platform-tests.live/'
  );

  response = await get('http://not-w3c-test.org');
  assert.equal(response.statusCode, 307);
  assert.equal(
    response.headers.location, 'http://not-web-platform-tests.live/'
  );
});

test('serves from .well-known/acme-challenge', async function() {
  const { dirname } = await this.startServer(8000, 9001);

  await writeFile(
    path.join(dirname, '.well-known', 'acme-challenge', 'hello'),
    'Hi there, from a test'
  );

  const response = await get(
    'http://w3c-test.org:8000/.well-known/acme-challenge/hello'
  );

  assert.equal(response.statusCode, 200);
  assert.equal(response.body, 'Hi there, from a test');
});

test('fails when either server cannot be started', async function() {
  const blocker = new net.Server();
  const sockets = [];

  blocker.on('connection', (socket) => sockets.push(socket));

  await new Promise((resolve, reject) => {
      blocker.on('listening', resolve);
      blocker.on('error', reject);

      blocker.listen(6666);
    });

  try {
    await (this.startServer(6666, 8005)
      .then(() => { throw new Error('this should fail'); }, () => {}));

    await (this.startServer(8005, 6666)
      .then(() => { throw new Error('this should fail'); }, () => {}));

  } finally {
    sockets.forEach((socket) => socket.end());
    await new Promise((resolve) => blocker.close(resolve));
  }
});
