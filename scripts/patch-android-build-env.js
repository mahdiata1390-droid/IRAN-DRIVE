/**
 * Tunes the CI-generated `android/gradle.properties` for a stable release build:
 *  - larger Gradle JVM heap + Metaspace (GitHub runners OOM with defaults)
 *  - bounded Kotlin daemon memory
 *  - capped worker count (fewer parallel C++/Kotlin workers = less memory)
 *  - ARM-only ABIs (arm64-v8a + armv7) — what real devices and Myket need;
 *    halves native build time and memory, drops x86 emulator slices
 * Idempotent: keys are replaced if present, appended if missing.
 * Runs in CI after `expo prebuild`, before `gradlew assembleRelease`.
 */
const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, '..', 'android', 'gradle.properties');
if (!fs.existsSync(file)) {
  console.error('patch-android-build-env: android/gradle.properties not found — run "bunx expo prebuild -p android --no-install" first');
  process.exit(1);
}

const settings = [
  // Gradle JVM: 3g heap + dedicated Metaspace (default 1g heap was OOMing)
  ['org.gradle.jvmargs', '-Xmx3g -XX:MaxMetaspaceSize=1g -XX:+HeapDumpOnOutOfMemoryError'],
  // Bounded workers: parallel C++/Kotlin compiles are the memory peak
  ['org.gradle.workers.max', '2'],
  ['org.gradle.parallel', 'true'],
  ['org.gradle.caching', 'true'],
  // Kotlin daemon: keep it modest so it can't eat the runner's 7G RAM
  ['kotlin.daemon.jvmargs', '-Xmx2g -XX:MaxMetaspaceSize=768m'],
  // Compile Kotlin inside the Gradle JVM (a secondary Kotlin daemon OOM-crashed silently on CI)
  ['kotlin.compiler.execution.strategy', 'in-process'],
  // Only device ABIs (real phones are arm64 or armv7); x86/x86_64 are emulator-only
  ['reactNativeArchitectures', 'arm64-v8a,armeabi-v7a'],
];

let g = fs.readFileSync(file, 'utf8');
for (const [key, value] of settings) {
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}=.*$`, 'm');
  if (re.test(g)) {
    g = g.replace(re, line);
  } else {
    if (!g.endsWith('\n')) g += '\n';
    g += `${line}\n`;
  }
}
fs.writeFileSync(file, g);
console.log('patch-android-build-env: applied —');
for (const [k, v] of settings) console.log(`  ${k}=${v}`);
