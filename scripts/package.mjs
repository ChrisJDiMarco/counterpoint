import { packager } from '@electron/packager';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const apps = await packager({
  dir: root, out: path.join(root, 'dist'), name: 'Counterpoint', executableName: 'Counterpoint',
  platform: 'darwin', arch: 'arm64', icon: path.join(root, 'assets/icon.icns'), overwrite: true, asar: true,
  appBundleId: 'com.chrisdimarco.counterpoint', appCategoryType: 'public.app-category.board-games',
  darwinDarkModeSupport: true, prune: true,
  ignore: [/^\/artifacts(?:\/|$)/, /^\/tests(?:\/|$)/, /^\/scripts(?:\/|$)/, /^\/dist(?:\/|$)/, /^\/PRODUCT\.md$/, /^\/README\.md$/, /^\/\.git(?:\/|$)/],
});
for (const directory of apps) {
  const appPath = path.join(directory, 'Counterpoint.app');
  execFileSync('/usr/bin/codesign', ['--force', '--deep', '--sign', '-', appPath], { stdio: 'inherit' });
  execFileSync('/usr/bin/codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });
  console.log(appPath);
}
