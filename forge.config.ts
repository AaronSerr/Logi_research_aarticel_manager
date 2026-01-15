import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { MakerDeb } from '@electron-forge/maker-deb';
import { MakerRpm } from '@electron-forge/maker-rpm';
import { AutoUnpackNativesPlugin } from '@electron-forge/plugin-auto-unpack-natives';
import { WebpackPlugin } from '@electron-forge/plugin-webpack';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';
import path from 'path';

import { mainConfig } from './webpack.main.config';
import { rendererConfig } from './webpack.renderer.config';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    // App metadata
    name: 'Research Article Manager',
    executableName: 'research-article-manager',
    // Extra resources outside asar archive (templates need to be accessible)
    extraResource: [
      path.resolve(__dirname, 'src/electron/templates')
    ],
    // Windows specific metadata
    win32metadata: {
      CompanyName: 'AaronSerr',
      ProductName: 'Research Article Manager',
      FileDescription: 'Research Article Management Application',
    },
  },
  rebuildConfig: {
    onlyModules: ['better-sqlite3'],
  },
  makers: [
    new MakerSquirrel({
      name: 'ResearchArticleManager',
      setupExe: 'ResearchArticleManagerSetup.exe',
      noMsi: true, // Use only Squirrel installer
    }),
    new MakerZIP({}, ['darwin']),
    new MakerRpm({
      options: {
        name: 'research-article-manager',
      },
    }),
    new MakerDeb({
      options: {
        name: 'research-article-manager',
        maintainer: 'AaronSerr',
        homepage: 'https://github.com/aaronserr/research-article-manager',
      },
    }),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: './src/index.html',
            js: './src/renderer.ts',
            name: 'main_window',
            preload: {
              js: './src/preload.ts',
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
