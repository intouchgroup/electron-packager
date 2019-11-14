
const winstaller = require('electron-winstaller').createWindowsInstaller;
const path = require('path');
const pkg = require(path.resolve(__dirname, 'package.json')); // module package
const rimraf = require('rimraf');

var options = {};

function build(wd, cpkg, src, platform, overwrite) {
  options.working = wd || '';
  options.clientPkg = cpkg || {};
  options.clientSrc = src || '';
  options.appPlatform = platform || '';
  options.shouldOverwrite = overwrite || true;
  options.loadingGif = path.resolve(__dirname, 'assets', 'loading.gif');

  options.productName = (options.clientPkg.productName == undefined)
      ? options.clientPkg.name
      : options.clientPkg.productName;
  options.installerName = `${options.productName}-${platform === 'win32:installer' ? 'win32-ia32' : 'win32-x64'}-Setup.exe`;
  options.description = (options.clientPkg.description == undefined) ? pkg.description : options.clientPkg.description;
  const custom = options.clientPkg.pack_install;
  if (custom != undefined && custom.win != undefined) {
    if (custom.win.loadingGif != undefined && custom.win.loadingGif !== '')
      options.loadingGif = path.resolve(wd, custom.win.loadingGif);
  }

  var startSec = new Date().getTime() / 1000;
  console.log('Creating windows installer...');
  return deleteInstallOutput()
    .then(getInstallConfig)
    .then(winstaller)
    .then(() => {
      var endSec = new Date().getTime() / 1000;
      console.log(`Win installer created.  (${endSec - startSec}s)`);
      return Promise.resolve();
    })
    .catch((error) => {
      console.error("Error", error.message || error);
      return Promise.reject();
    });
}

// create config for installer
function getInstallConfig() {
  return Promise.resolve({
    appDirectory: path.resolve(options.working, 'output', `${options.productName}-win32-${options.appPlatform === 'win32:installer' ? 'ia32' : 'x64'}`),
    noMsi: true,
    outputDirectory: path.resolve(options.working, 'output', 'installer'),
    exe: options.productName + '.exe',
    setupExe: options.installerName,
    description: options.description,
    authors: 'Intouch Group',
    loadingGif: options.loadingGif
  });
}

// delete existing installer output
function deleteInstallOutput() {
  return new Promise((resolve, reject) => {
    rimraf(path.resolve(options.working, 'output', 'installer', options.installerName), (error) => {
      resolve();
    });
  });
}


module.exports = {
  build: build
};

