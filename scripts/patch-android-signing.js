/**
 * Prepares an unsigned-expo-generated `android/` folder for a release APK build:
 *  - generates a signing keystore (once) from env vars,
 *  - injects signingConfig "release" into android/app/build.gradle.
 * Runs inside the GitHub Actions android-build workflow before `gradlew assembleRelease`.
 * Idempotent: safe to re-run.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const androidDir = path.join(__dirname, '..', 'android');
const gradle = path.join(androidDir, 'app', 'build.gradle');
const ksPath = path.join(androidDir, 'app', 'uchiha-release.keystore');

for (const f of [gradle]) {
  if (!fs.existsSync(f)) {
    console.error(`patch-android-signing: ${f} not found — run "bunx expo prebuild -p android" first`);
    process.exit(1);
  }
}

const storePass = process.env.ANDROID_STORE_PASSWORD || 'uchiha-release';
const keyPass = process.env.ANDROID_KEY_PASSWORD || 'uchiha-release';
const alias = process.env.KEY_ALIAS || 'uchiha';

// 1. keystore (only if missing — CI is ephemeral)
if (!fs.existsSync(ksPath)) {
  execSync(
    `keytool -genkeypair -v -storetype PKCS12 -keystore "${ksPath}" ` +
      `-alias ${alias} -keyalg RSA -keysize 2048 -validity 10000 ` +
      `-storepass ${storePass} -keypass ${keyPass} ` +
      `-dname "CN=UCHIHA Clan Messenger, OU=UCHIHA, O=UCHIHA Clan, L=Tehran, C=IR"`,
    { stdio: 'inherit' },
  );
}

// 2. signing config in build.gradle
let g = fs.readFileSync(gradle, 'utf8');
if (!g.includes('signingConfigs {')) {
  g = g.replace(
    'android {',
    `android {
    signingConfigs {
        release {
            storeFile file('uchiha-release.keystore')
            storePassword '${storePass}'
            keyAlias '${alias}'
            keyPassword '${keyPass}'
        }
    }`,
  );
}
if (!/buildTypes\s*\{\s*\n\s*release\s*\{/.test(g) || !g.includes('signingConfig signingConfigs.release')) {
  g = g.replace(
    /buildTypes\s*\{\s*release\s*\{/,
    `buildTypes {
        release {
            signingConfig signingConfigs.release`,
  );
}
fs.writeFileSync(gradle, g);
console.log('patch-android-signing: keystore + signingConfig ready');
