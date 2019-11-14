const installer = require('electron-installer-dmg');
const path = require('path');
const pkg = require(path.resolve(__dirname, 'package.json')); // module package
const childprocess = require('child_process');
const promisify = require('es6-promisify');

var options = {};

function build(wd, cpkg, src, platform, overwrite) {
  options.working = wd || '';
  options.clientPkg = cpkg || {};
  options.clientSrc = src || '';
  options.appPlatform = platform || '';
  options.shouldOverwrite = overwrite || true;

  options.productName = (options.clientPkg.productName == undefined)
      ? options.clientPkg.name
      : options.clientPkg.productName;

  options.description = (options.clientPkg.description == undefined)
      ? pkg.description
      : options.clientPkg.description;

  childprocess.spawnSync('mkdir', [path.resolve(options.working, 'output', 'installer')]);

  var startSec = new Date().getTime() / 1000;
  console.log('Creating darwin installer...');

  let pInstall = promisify(installer);
  return getInstallConfig()
      .then(pInstall)
      .then(() => {
        var endSec = new Date().getTime() / 1000;
        console.log(`Darwin installer created. (${endSec - startSec}s)`);
        return Promise.resolve();
      })
      .catch((error) => {
        console.error(`Failed to create darwin installer. ${error.message || error}`);
        return Promise.reject();
      });
}

function getInstallConfig() {
  // set defaults
  var background = path.resolve(__dirname, 'assets', 'loading.gif');
  var icon = path.resolve(__dirname, 'assets', 'icon.ico');
  var debug = false;

  // find custom attributes
  const custom = options.clientPkg.pack_install;
  if (custom != undefined && custom.dmg != undefined) {
    if (custom.dmg.background != undefined && custom.dmg.background !== '') {
      background = custom.dmg.background;
    }
    if (custom.dmg.icon != undefined && custom.dmg.icon !== '') {
      icon = custom.dmg.icon;
    }
    if (custom.dmg.debug != undefined && custom.dmg.debug !== '') {
      debug = custom.dmg.debug;
    }
  }

  // return promise with config
  return new Promise((resolve, reject) => {
    resolve({
      appPath: path.resolve(options.working, 'output', `${options.productName}-darwin-x64`, `${options.productName}.app`),
      name: options.productName,
      background: background,
      icon: icon,
      overwrite: options.shouldOverwrite,
      debug: debug,
      out: path.resolve(options.working, 'output', 'installer')
    });
  });
}

module.exports = {
  build: build
};
