const version = process.env.npm_package_version;
console.log(version);

if (!version) {
  console.error(
    "Error: Do NOT run this script directly with node. Run this script with npm or yarn!"
  );
  process.exit(1);
}

const { MSICreator } = require("electron-wix-msi");
const { readFileSync } = require("fs");
const path = require("path");
const replace = require("replace-in-file");
const xml2js = require("xml2js");
const async = require("async");
const _ = require("lodash");

const APP_DIR = path.resolve(__dirname, "./dist/win-unpacked");
const OUT_DIR = path.resolve(__dirname, "./setup");

const fileName = "Konnect";
const wxsPath = path.join(OUT_DIR, fileName + ".wxs");

const msiCreator = new MSICreator({
  appDirectory: APP_DIR,
  outputDirectory: OUT_DIR,

  // Configure metadata
  description: "This application is used to configure Kensington Web Cameras.",
  exe: fileName,
  name: "Kensington Konnect",
  manufacturer: "Kensington",
  version: version,
  upgradeCode: "9f1e02f3-1b8d-454d-9e7d-0af8174a9f00",
  // Configure installer User Interface
  ui: {
    chooseDirectory: true,
  },
  appIconPath: path.join(__dirname, "public", "kensington_software_logo.ico"),
  extensions: ["WixUIExtension", "WixUtilExtension"],
});
msiCreator.wixTemplate = readFileSync(path.join(__dirname, "wix.xml"), "utf-8");
msiCreator.uiTemplate = readFileSync(path.join(__dirname, "ui.xml"), "utf-8");

/* msiCreator
  .create()
  .then(() => {
    return replace({
      files: wxsPath,
      from: '<RegistryValue Name="DisplayIcon" Type="expandable" Value="[SystemFolder]msiexec.exe" KeyPath="yes"/>',
      to: `<RegistryValue Name="DisplayIcon" Type="expandable" Value="[APPLICATIONROOTDIRECTORY]app-${version}\\${fileName}.exe" KeyPath="yes"/>`,
    });
  })
  .then(() => {
    //msiCreator.compile();
  })
  .catch((err) => {
    console.error(err);
  }); */

/* msiCreator.wxsFile =
  "D:\\Projects\\Konnect\\electron-react-ts\\setup\\Konnect.wxs";
msiCreator.compile(); */

//return;
async.waterfall(
  [
    async.asyncify(() => {
      // Create wsx script using electron-wix-msi
      return msiCreator.create();
    }),
    (data, callback) => {
      // Parse the result using xml2js
      xml2js.parseString(data["wxsContent"], callback);
    },
    (data, callback) => {
      // Get id of main app exe for the next step

      let component = _.get(data, [
        "Wix",
        "Product",
        0,
        "Directory", // <Directory Id="TARGETDIR" Name="SourceDir">
        0,
        "Directory", // <Directory Id="ProgramFilesFolder">
        0,
        "Directory", // <Directory Id="APPLICATIONROOTDIRECTORY" Name="Kensington Konnect">
        0,
        "Directory", // <Directory Id="" Name="app-{{version}}">
        0,
        "Component",
      ]);
      if (_.isNil(component)) {
        callback(
          "Path: Wix/Product/Directory/Directory/Directory/ not found in wsx file."
        );
        return;
      }

      let res = _.find(component, (item) => {
        return _.startsWith(_.get(item, ["$", "Id"], ""), `_${fileName}.exe_`);
      });

      let id = _.get(res, ["$", "Id"]);
      if (_.isNil(id)) {
        callback(`Cannot find Component Id of ${fileName}.exe in wsx file.`);
      }

      callback(null, id);
    },
    async.asyncify((id) => {
      // Configure auto start application after installation
      // See tutorial here:
      // https://wixtoolset.org/documentation/manual/v3/howtos/ui_and_localization/run_program_after_install.html
      return replace({
        files: wxsPath,
        from: `<Property Id="WixShellExecTarget" Value="[#${fileName}.exe]" />`,
        to: `<Property Id="WixShellExecTarget" Value="[#${id}]" />`,
      });
    }),
    async.asyncify(() => {
      // Configure uninstall icon
      return replace({
        files: wxsPath,
        from: '<RegistryValue Name="DisplayIcon" Type="expandable" Value="[SystemFolder]msiexec.exe" KeyPath="yes"/>',
        to: `<RegistryValue Name="DisplayIcon" Type="expandable" Value="[APPLICATIONROOTDIRECTORY]app-${version}\\${fileName}.exe" KeyPath="yes"/>`,
      });
    }),
    async.asyncify(() => {
      return msiCreator.compile();
    }),
  ],
  (err, result) => {
    console.log(err);
    console.log(result);
    console.log("end");
  }
);
