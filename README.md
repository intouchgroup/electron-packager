## @intouchgroup/electron-packager

CLI to pack and install Electron apps for different platforms

##### Windows Information
This tool was only tested using a Mac, however, it will build applications for windows.


##### Mac Information
To sign darwin and mas apps, you must have the correct certificates install in your keychain.  
To build and sign windows apps on a mac, you will need to install mono and wine. Both can be installed with homebrew.

##### Linux Information
Building for linux is not currently supported.

##### Fully Supported Platforms (more to come)
* Windows-ia32 
* Darwin (mac) x64

##### Direct Dependencies
* Electron (build applications)
* Electron Builder (build applications)
* Electron Packager (package applications)
* Electron Installer DMG (build darwin installer)
* Electron Winstaller (build windows installer)
* Prompt (prompt for user input)
* Signcode (sign windows executables)


### Installing
Pack Install is a module out on Intouch's private npm registry. If you are already connected, you can simply install this package globally with `npm install -g @intouchgroup/electron-packager`. We recommend installing it globally so you can reuse it across projects and run the scripts with using npm directy. Use `pack_install version` to check which version of @intouchgroup/electron-packager you are running.


### Usage
Pack install is a command line interface using the command `pack_install`.
The subcommands to use with this program are:
* `pack` - Used to package up the application code and create an executable or app based on platform
* `sign` - Used to sign the application with the correct certificate. For windows applications, a cert is provided within this module or specify a custom one (see custom config section). For darwin and mas apps, the correct certificates must be added in you keychain and will only work on a Mac.
* `release` - Used to perform all the necessary steps to build an application that can be distributed. Steps like packaging app, signing app, and building installers or dmgs.


### Flags
The available flags to use along with the subcommands are:
* `src` - Relative path for source code. Should be directory where the main.js, for electron, lives. (Default: current working directory)
* `overwrite` - Boolean to specify if program should overwrite existing packages/signatures. (Default: true)
* `platform` - Specify platform to build for.
    * `win32` - Windows with ia32 arch
    * `win64` - Windows with 32x64 arch
    * `darwin` - Mac app with x64 arch for applications outside of Mac App Store
    * `mas` - Mac app for distribution inside Mac App Store
    * `linuxv7` - linux armv7 arch
    * `linux32` - linux x32 arch
    * `linux64` - linux x64 arch
    * `all` - To perform operation for all the platforms. (default)
For the platform flag, if you append `:installer` to any of these, it will perform that action to just the installer. For example `pack_install pack --platform=win32:installer` will build the installer for the win32 application. You can use the installer extension for pack and sign but an application must already exist.


### Examples
* `pack_install pack --src=. --platform=darwin` package up electron app from src in the current directory and output a mac app
* `pack_install sign --src=. --platform=darwin` sign the electron app you just built with the previous command
* `pack_install release --src=.\public\ --platform=win32` full release for a windows app with src in a public folder. This will pack the app, sign, build the installer, then sign the installer.


### Application Settings
In application you are building, you can provided specific settings for just that build. You should place these configuration settings in your application's package.json file located at the root of your project.

```json
{
    "name": "", // (Naming follows standard npm rules.)
    "productName": "", // This will be the name of the application and a prefix for the name of the installer executable. (Naming follows standard npm rules.)
    "description": "", // Used as application description if provided.
    "scripts": { // your npm scripts
        "release": "pack_install release --src=. --platform=win32"
    },
    "settings": {
        "electron": {
            "fullscreenOnStart": true, // On application launch, the app will go into fullscreen mode. (default: true, esc or F11 to exit)
            "disableZoom": true, // To disable zoom at the electron application level. (default: true)
            "initialZoom": 1.0, // To change initial zoom level at the start of the application. (default: 1.0)
            "dimensions": { // Dimensions of window on start up. If fullscreenOnStart is true, the window will be set to the specified size on exit of fullscreen.
                "mainWindow": {
                    "width": 1920,
                    "height": 1080
                }
            }
        }
    },
    "pack_install": { // Pack Install settings that have to do with build or signing.
        "win": { // windows installer settings
            "password": "...", // signing cert password for windows.
            "loadingGif": "", // File path to a gif for the loading animation while installation is occurring.
            "certPath": "path to signing cert", // file path to signing cert
        },
        "dmg": { // darwin installer settings
            "background": "", // File path to a gif for the loading animation while installation is occurring.
            "icon": "", // File path to an application icon. Must be of file type ico.
            "debug": false, 
        }
    }
}
```
