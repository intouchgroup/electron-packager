#! /usr/bin/env node

const processCommand = require('./');
const path = require('path');

processCommand(
  process.argv.splice(2), // arguments
  process.cwd(), // current working directory
  path.resolve(process.cwd(), 'package.json') // package json for app
);
