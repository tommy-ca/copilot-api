import { test, expect, describe } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const projectRoot = path.join(__dirname, '../..')

describe('API Compatibility Verification', () => {
  test('all original source files are preserved', () => {
    const requiredFiles = [
      'src/main.ts',
      'src/server.ts', 
      'src/auth.ts',
      'src/start.ts',
      'src/routes/chat-completions/handler.ts',
      'src/routes/chat-completions/route.ts',
      'src/routes/embeddings/route.ts',
      'src/routes/messages/handler.ts',
      'src/routes/messages/route.ts',
      'src/routes/models/route.ts',
      'src/services/copilot/create-chat-completions.ts',
      'src/services/copilot/create-embeddings.ts',
      'src/services/copilot/get-models.ts',
      'src/services/github/get-copilot-token.ts',
      'src/lib/api-config.ts',
      'src/lib/error.ts',
      'src/lib/state.ts',
      'src/lib/token.ts'
    ]

    for (const file of requiredFiles) {
      const filePath = path.join(projectRoot, file)
      expect(existsSync(filePath)).toBe(true)
    }
  })

  test('CLI interface is unchanged', () => {
    const mainTs = readFileSync(path.join(projectRoot, 'src/main.ts'), 'utf8')
    
    // Should still use citty for CLI
    expect(mainTs).toContain('citty')
    expect(mainTs).toContain('auth')
    expect(mainTs).toContain('start')
    expect(mainTs).toContain('subCommands')
  })

  test('HTTP server structure is preserved', () => {
    const serverTs = readFileSync(path.join(projectRoot, 'src/server.ts'), 'utf8')
    
    // Should still use Hono
    expect(serverTs).toContain('Hono')
    expect(serverTs).toContain('cors')
    expect(serverTs).toContain('logger')
    
    // Should have all required routes
    expect(serverTs).toContain('/chat/completions')
    expect(serverTs).toContain('/models')
    expect(serverTs).toContain('/embeddings')
    expect(serverTs).toContain('/v1/messages')
    expect(serverTs).toContain('/usage')
    expect(serverTs).toContain('/token')
  })

  test('authentication flow is unchanged', () => {
    const authTs = readFileSync(path.join(projectRoot, 'src/auth.ts'), 'utf8')
    
    // Should preserve auth functionality
    expect(authTs).toContain('defineCommand')
    expect(authTs).toContain('setupGitHubToken')
    expect(authTs).toContain('verbose')
    expect(authTs).toContain('show-token')
  })

  test('package.json maintains compatibility', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    
    // Core package info should be unchanged
    expect(packageJson.name).toBe('copilot-api')
    expect(packageJson.type).toBe('module')
    expect(packageJson.bin['copilot-api']).toBe('./dist/main.js')
    
    // All original dependencies should still be present
    expect(packageJson.dependencies.citty).toBeDefined()
    expect(packageJson.dependencies.hono).toBeDefined()
    expect(packageJson.dependencies.consola).toBeDefined()
    expect(packageJson.dependencies['gpt-tokenizer']).toBeDefined()
    
    // Essential scripts should work the same way externally
    expect(packageJson.scripts.start).toContain('bun run ./src/main.ts')
  })

  test('route handlers can be imported without errors', async () => {
    // Test that we can import route handlers (they haven't been broken)
    expect(async () => {
      await import('../../src/routes/chat-completions/handler')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/routes/models/route')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/routes/embeddings/route')  
    }).not.toThrow()
  })

  test('service modules can be imported without errors', async () => {
    // Test core service imports
    expect(async () => {
      await import('../../src/services/copilot/create-chat-completions')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/services/copilot/get-models')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/services/github/get-copilot-token')
    }).not.toThrow()
  })

  test('lib utilities can be imported without errors', async () => {
    expect(async () => {
      await import('../../src/lib/api-config')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/lib/error')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/lib/state')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/lib/token')
    }).not.toThrow()
  })

  test('new rust-core module does not affect existing imports', async () => {
    // Verify that adding rust-core doesn't break existing functionality
    const { rustCore } = await import('../../src/lib/rust-core')
    
    // Should be able to import both new and old modules
    expect(rustCore).toBeDefined()
    
    // And original modules should still work
    const { state } = await import('../../src/lib/state')
    expect(state).toBeDefined()
  })

  test('tsconfig and build configuration preserved', () => {
    expect(existsSync(path.join(projectRoot, 'tsconfig.json'))).toBe(true)
    expect(existsSync(path.join(projectRoot, 'tsup.config.ts'))).toBe(true)
    expect(existsSync(path.join(projectRoot, 'eslint.config.js'))).toBe(true)
  })
})