//
//
//

const signcode = require('signcode');
const osxSign = require('electron-osx-sign');
const path = require('path');
const parser = require('./parser.js');
const pkg = require('./package.json'); // module package
const prompt = require('prompt');
const promisify = require('es6-promisify');
const childprocess = require('child_process');


module.exports = sign = (wd, platform, cpkg, overwrite) => {
  cpkg = cpkg || {};
  platform = platform || 'all';
  if (typeof overwrite != 'boolean')
    overwrite = true;

  var config = {
    all: false,
    platform: platform,
    wd: wd,
    cpkg: cpkg,
    cert: path.resolve(__dirname, 'assets', 'certs', 'intouch-electron.p12'),
    overwrite: overwrite,
    appCertName: 'Developer ID Application: * (*)',
    installerCertName: 'Developer ID Installer: * (*)'
  };

  if (platform === 'all') {
    config.all = true;
  }

  return getConfig(config)
      .then(promptForPassword)
      .then(signCode);
}

function getConfig(config) {
  const custom = config.cpkg.pack_install;
  if (custom != undefined) {
    // check for cert path in client package.json

    // check win custom config
    if (config.platform.includes('win')) {
      if (custom.win.certPath != undefined && custom.win.certPath !== '')
        config.cert = path.resolve(custom.win.certPath);

      if (custom.win.password != undefined && custom.win.password != '')
        config.password = custom.win.password;

    } else if (config.platform.includes('darwin')) {
      // check custom mac app cert
      if (custom.darwin.appCertName != undefined && custom.darwin.appCertName !== '')
        config.appCertName = custom.dmg.appCertName;
      // check custom mac installer cert
      if (custom.darwin.installerCertName != undefined && custom.darwin.installerCertName !== '')
        config.installerCertName = custom.darwin.installerCertName;
    } else if (config.platform.includes('mas')) {

    }
  }

  var productName = (config.cpkg.productName == undefined)
      ? config.cpkg.name
      : config.cpkg.productName;
  console.log(`product name ${productName}`);

  if (config.all)
    return Promise.resolve(config);

  // build path based on platform
  switch (config.platform) {
    case 'win32':
      config.path = path.resolve(config.wd, 'output', `${productName}-win32-ia32`, `${productName}.exe`);
      break;
    case 'win64':
      config.path = path.resolve(config.wd, 'output', `${productName}-win32-x64`, `${productName}.exe`);
      break;
    case 'win32:installer':
      config.path = path.resolve(config.wd, 'output', 'installer', `${productName}-win32-ia32-Setup.exe`);
      break;
    case 'win64:installer':
      config.path = path.resolve(config.wd, 'output', 'installer', `${productName}-win32-x64-Setup.exe`);
      break;
    case 'darwin':
      config.path = path.resolve(config.wd, 'output', `${productName}-darwin-x64`, `${productName}.app`);
      break;
    case 'mas':
      config.path = path.resolve(config.wd, 'output', `${productName}-mac-x64`, `${productName}.app`);
      break;
    case 'darwin:installer':
      config.path = path.resolve(config.wd, 'output', 'installer', `${productName}.dmg`);
      break;
    case 'mac:installer':
      config.path = path.resolve(config.wd, 'output', 'installer', `${productName}.dmg`);
      break;
    case 'linuxv7':
      config.path = path.resolve(config.wd, 'output', `${productName}-linux-armv7l`, `${productName}`);
      break;
    case 'linux32':
      config.path = path.resolve(config.wd, 'output', `${productName}-linux-ia32`, `${productName}`);
      break;
    case 'linux64':
      config.path = path.resolve(config.wd, 'output', `${productName}-linux-x64`, `${productName}`);
      break;
  }

  return Promise.resolve(config);
}

function promptForPassword(config) {
  if (config.platform.includes('mas') || config.platform.includes('darwin')) {
    return Promise.resolve(config);
  }
  if (config.password != undefined && config.password !== '') {
    return Promise.resolve(config);
  }
  return new Promise((resolve, reject) => {
    console.log('Need password for signing cert.');
    prompt.start();
    prompt.get([{name: 'password', description: 'Enter cert password: ', hidden: true}], (err, result) => {
      if (err) {
        reject(err);
      } else {
        config.password = result.password;
        resolve(config);
      }
    });
  });
}

function signCode(config) {
  switch (config.platform) {
      case 'win32':
      case 'win64':
      case 'win32:installer':
      case 'win64:installer':
        return signWin(config);
      case 'darwin':
      case 'mas':
      case 'darwin:installer':
      case 'mac:installer':
        return signMac(config);
      case 'linuxv7':
      case 'linux32':
      case 'linux64':
      case 'linuxv7:installer':
      case 'linux32:installer':
      case 'linux64:installer':
        return signLinux(config);
      default:
        return Promise.reject({message: 'invalid platform: ' + config.platform});
    }
}

function exec(command, args) {
  console.log(`Running command \n=>\t${command} \n=>\t${args}`);
  return new Promise((resolve, reject) => {
    const cr = childprocess.spawn(command, args, {shell: true});
    // cr.stderr.on('data', (data) => {
    //   console.log(`Error Running command \n=>\t${command}`, data);
    // });
    cr.on('error', (err) => {
      console.log(`Error Running command \n=>\t${command}`, err);
    });
    cr.on('close', (code) => {
      console.log(`${command} finished with code: ${code}`);
      if (code === 0) {
        resolve();
      } else {
        reject({code: code});
      }
    });
  });
}



// Mac signing

function signMac(config) {
  const isInstaller = config.platform.includes('installer');

  const signId = isInstaller ? config.installerCertName : config.appCertName;
  if (isInstaller) {
    return Promise.resolve();
  }
  process.env.CSC_NAME = signId;

  let osx = promisify(osxSign)

  return osx({
    app: config.path,
    platform: config.platform
  });
}

// Linux signing

function signLinux(config) {
  return Promise.resolve();
}

// Windows sign and verify

function signWin(config) {

  if (process.platform === 'win32') {
    console.log('Signing windows app from windows...');
    var signtool = path.resolve(__dirname, 'assets', 'signtool.exe');
    return exec(`"${signtool}"`, ['sign', '/f', `"${config.cert}"`, '/p', `"${config.password}"`, '/t', 'http://timestamp.verisign.com/scripts/timstamp.dll', '/v', `"${config.path}"`])
        .then(() => {
          return Promise.resolve(config);
        })
        .catch((error) => {
          console.log('Failed to sign app from windows.');
          return Promise.reject(error);
        });
  }

  console.log('Signing windows app...');
  let winSign = promisify(signcode.sign);
  const options = {
    cert: config.cert,
    overwrite: config.overwrite,
    path: config.path,
    password: config.password
  };

  return winSign(options)
      .then(() => {
        return Promise.resolve(config);
      })
      .then(verifyWin);
}

function verifyWin(config) {
  console.log('Verifying...');
  let winVerify = promisify(signcode.verify);

  return winVerify({path: config.path})
      .then(() => {
        console.log('Everything looks good.');
      });
}

