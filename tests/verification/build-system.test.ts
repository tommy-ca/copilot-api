import { test, expect, describe } from 'bun:test'
import { execSync } from 'child_process'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const projectRoot = path.join(__dirname, '../..')

describe('Build System Verification', () => {
  test('package.json has correct hybrid build scripts', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    
    // Verify required scripts exist
    expect(packageJson.scripts.build).toContain('build:native')
    expect(packageJson.scripts['build:native']).toBe('cd native && cargo build --release')
    expect(packageJson.scripts.dev).toContain('build:native')
    expect(packageJson.scripts['test:native']).toBe('cd native && cargo test')
    expect(packageJson.scripts['lint:rust']).toBe('cd native && cargo clippy')
    
    // Verify files include native module output
    expect(packageJson.files).toContain('dist')
    expect(packageJson.files).toContain('native/target/release/*.node')
  })

  test('native directory structure is correct', () => {
    const nativeDir = path.join(projectRoot, 'native')
    
    // Core files
    expect(existsSync(path.join(nativeDir, 'Cargo.toml'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'build.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/lib.rs'))).toBe(true)
    
    // Module structure
    expect(existsSync(path.join(nativeDir, 'src/utils/mod.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/utils/tokenizer.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/utils/rate_limit.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/utils/validation.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/github/mod.rs'))).toBe(true)
    expect(existsSync(path.join(nativeDir, 'src/auth/mod.rs'))).toBe(true)
  })

  test('Cargo.toml is properly configured for native module', () => {
    const cargoToml = readFileSync(path.join(projectRoot, 'native/Cargo.toml'), 'utf8')
    
    // Should be configured as cdylib
    expect(cargoToml).toContain('crate-type = ["cdylib"]')
    expect(cargoToml).toContain('name = "copilot-api-native"')
    
    // Should have required dependencies
    expect(cargoToml).toContain('neon = "1.0"')
    expect(cargoToml).toContain('tokio')
    expect(cargoToml).toContain('reqwest')
    expect(cargoToml).toContain('serde')
    expect(cargoToml).toContain('anyhow')
    expect(cargoToml).toContain('thiserror')
    
    // Should have build dependencies
    expect(cargoToml).toContain('[build-dependencies]')
    expect(cargoToml).toContain('neon-build')
  })

  test('Rust code compiles without errors', () => {
    // This will throw if compilation fails
    expect(() => {
      execSync('cd native && cargo check', { 
        cwd: projectRoot,
        stdio: 'pipe' // Suppress output unless there's an error
      })
    }).not.toThrow()
  })

  test('TypeScript code still compiles', () => {
    // Verify TypeScript compilation still works
    expect(() => {
      execSync('bun run build', {
        cwd: projectRoot,
        stdio: 'pipe'
      })
    }).not.toThrow()
  })

  test('dist directory contains expected files after build', () => {
    // Build the project
    execSync('bun run build', { cwd: projectRoot, stdio: 'pipe' })
    
    const distDir = path.join(projectRoot, 'dist')
    expect(existsSync(distDir)).toBe(true)
    expect(existsSync(path.join(distDir, 'main.js'))).toBe(true)
  })

  test('development scripts work correctly', () => {
    // Test that dev scripts don't crash
    expect(() => {
      execSync('npm run build:native', {
        cwd: projectRoot,
        stdio: 'pipe'
      })
    }).not.toThrow()

    expect(() => {
      execSync('npm run test:native', {
        cwd: projectRoot,
        stdio: 'pipe'
      })
    }).not.toThrow()
  })
})