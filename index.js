#! /usr/bin/env node

const path = require('path');
const fs = require('fs');
const parser = require('./parser.js');
const sign = require('./signer.js');
const childprocess = require('child_process');
const isWin = /^win/.test(process.platform);
const packager = require('electron-packager');

const _platforms = ['win32', 'win64', 'darwin', 'mas', 'linuxv7', 'linux32', 'linux64'];

module.exports = processCommand = (args, wd, cpkg) => {
  const options = parser.parseArgs(args);

  if (options.attrs.includes('version') || options.version) {
    const pkg = require('./package.json');
    console.log("Pack install version:", pkg.version);
    return process.exit(0);
  }
  
  
  console.log(`cwd ${wd}`);

  var config = {
    wd: wd,
    cpkg: require(cpkg),
    platform: options.platform || 'all',
    arch: archForPlatform(options.platform || 'all'),
    src: validateSource(options.src || wd),
    overwrite: options.overwrite || true
  };


  if (typeof config.overwrite != 'boolean')
    config.overwrite = true;

  
  validateElectronDeps(config);

  if (options.attrs.includes('sign')) {
    signApp(config)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.log('Error signing app. ', error.message || error);
        console.log(error);
        process.exit(1);
      });
  } else if (options.attrs.includes('pack')) {
    pack(config)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        console.log('Error packing app. ' + error.message || error);
        console.log(error);
        process.exit(1);
      });
  } else if (options.attrs.includes('release')) {
    release(config)
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        error = error || {};
        console.log('Error building for release. ' + error.message || error);
        process.exit(1);
      });
  } else {
    console.error('Unknown operation.');
    process.exit(1);
  }
}


function validateSource(src) {
  if (src.includes('/') && isWin) {
    // running on windows with mac paths
    src = src.replace(/\//g, '\\');
  } else if (src.includes('\\') && !isWin) {
    // running on mac with windows paths
    src = src.replace(/\\/g, '/');
  }
  console.log("validated src", src);
  return src;
}

/**
 * Method to validate main.js/package.json are in the src directory
 */
function validateElectronDeps(config) {
  let appPath = path.resolve(config.src, "main.js");
  let packagePath = path.resolve(config.src, "package.json");

  // copy main.js to src directory if it does not exist
  fs.access(appPath, err => {
    if (err) {
      let currentAppPath = path.resolve(config.wd, "main.js");
      console.log(`\tCopying main.js to src directory:\n\t${currentAppPath}\n\tto\n\t${appPath}\n`);
      fs.createReadStream(currentAppPath).pipe(fs.createWriteStream(appPath));
    }
  });
  // copy package.json to src directory if it does not exist
  fs.access(packagePath, err => {
    if (err) {
      let currentPackagePath = path.resolve(config.wd, "package.json");
      console.log(`\tCopying main.js to src directory:\n\t${currentPackagePath}\n\tto\n\t${packagePath}\n`);
      fs.createReadStream(currentPackagePath).pipe(fs.createWriteStream(packagePath));
    }
  });
}

function signApp(config) {
  return sign(config.wd, config.platform, config.cpkg, config.overwrite);
}

function pack(config) {
  if (config.platform.includes('installer')) {
    return buildInstaller(config);
  }

  var outputPath = path.resolve(config.wd, 'output');

  let packagerOptions = {
    dir: config.src,
    electronVersion: "1.8.4",
    out: outputPath,
    overwrite: config.overwrite,
    appCopyright: config.cpkg.copyright ? config.cpkg.copyright : `Copyright ${new Date().getFullYear()} ${config.cpkg.author}`,
    name: config.cpkg.productName ? config.cpkg.productName : config.cpkg.name,
    companyName: config.cpkg.companyName ? config.cpkg.companyName : config.cpkg.author
  };

  if (config.platform === 'all') {
    packagerOptions.all = true;
  } else {
    packagerOptions.arch = config.arch;
    packagerOptions.platform = config.platform;
  }

  return new Promise((resolve, reject) => {
    packager(packagerOptions, (err, paths) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}

function buildInstaller(config) {
  if (!config.platform.includes('installer'))
    return Promise.reject({message: 'tying to build installer when platform does not include installer'});

  var installer = {};
  switch (config.platform) {
    case 'win32:installer':
    case 'win64:installer':
      installer = require(path.resolve(__dirname, 'win-installer.js'));
      break;
    case 'darwin:installer':
      installer = require(path.resolve(__dirname, 'darwin-installer.js'));
      break;
    case 'linuxv7:installer':
    case 'linux32:installer':
    case 'linux64:installer':
      installer = require(path.resolve(__dirname, 'linux-installer.js'));
      break;
    default:
      console.log('Unknown installer for platform: ' + config.platform);
      break;
  }

  if (installer) {
    return installer.build(config.wd, config.cpkg, config.src, config.platform, config.overwrite);
  } else {
    return Promise.reject('failed to find installer for provided platform. ' + config.platform);
  }
}


function release(config) {

  if (config.platform === 'all') {
    return new Promise((resolve, reject) => {
      _platforms.forEach((plat) => {
        config.arch = archForPlatform(plat);
        releasePlatform(config);
      });
      resolve();
    });
  } else {
    return releasePlatform(config);
  }
}

function releasePlatform(config) {
  return pack(config)
      .then(() => {
        return Promise.resolve(config);
      })
      .then(signApp)
      .then(() => {
        config.platform = `${config.platform}:installer`;
        return Promise.resolve(config);
      })
      .then(pack)
      .then(() => {
        return Promise.resolve(config);
      })
      .then(signApp)
      .then(() => {
        console.log('release finished for platform ' + config.platform.split(':')[0]);
        return Promise.resolve(config);
      });
}

// function exec(command, args) {
//   console.log(`Running command \n=>\t${command} \n=>\t${args}`);
//   return new Promise((resolve, reject) => {
//     const cr = childprocess.spawn(command, args, {shell: true});

//     cr.on('close', (code) => {
//       console.log(`${command} finished with code: ${code}`);
//       if (code === 0) {
//         resolve();
//       } else {
//         reject({code: code, message: `Failed exec command: ${command}`});
//       }
//     });
//   });
// }


function archForPlatform(platform) {
  if (!platform || platform === '')
    return '';

  switch (platform) {
    case 'win32':
    case 'win32:installer':
      return 'ia32';
    case 'win64':
    case 'win64:installer':
      return 'x64';
    case 'darwin':
    case 'darwin:installer':
      return 'x64';
    case 'mas':
      return 'x64';
    case 'linuxv7':
    case 'linuxv7:installer':
      return 'armv7l'
    case 'linux32':
    case 'linux32:installer':
      return 'ia32';
    case 'linux64':
    case 'linux64:installer':
      return 'x64';
    default:
      return '';
  }
}
