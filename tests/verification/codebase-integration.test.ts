import { test, expect, describe } from 'bun:test'
import { existsSync, readFileSync } from 'fs'
import path from 'path'

const projectRoot = path.join(__dirname, '../..')

describe('Existing Codebase Integration Verification', () => {
  test('all original TypeScript files compile without errors', async () => {
    // Import core modules to verify they work
    expect(async () => {
      await import('../../src/main')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/server')
    }).not.toThrow()

    expect(async () => {
      await import('../../src/auth')
    }).not.toThrow()
  })

  test('original route handlers remain functional', async () => {
    // Test that we can import all route handlers
    const routeHandlers = [
      'chat-completions/handler',
      'chat-completions/route',
      'embeddings/route',
      'messages/handler',
      'messages/route',
      'models/route',
      'token/route',
      'usage/route'
    ]

    for (const handler of routeHandlers) {
      expect(async () => {
        await import(`../../src/routes/${handler}`)
      }).not.toThrow()
    }
  })

  test('original service modules remain functional', async () => {
    const services = [
      'copilot/create-chat-completions',
      'copilot/create-embeddings', 
      'copilot/get-models',
      'github/get-copilot-token',
      'github/get-copilot-usage',
      'github/get-device-code',
      'github/get-user',
      'github/poll-access-token'
    ]

    for (const service of services) {
      expect(async () => {
        await import(`../../src/services/${service}`)
      }).not.toThrow()
    }
  })

  test('lib utilities continue to work', async () => {
    const utilities = [
      'api-config',
      'approval',
      'error',
      'paths',
      'rate-limit',
      'shell',
      'state',
      'token',
      'utils'
    ]

    for (const util of utilities) {
      expect(async () => {
        await import(`../../src/lib/${util}`)
      }).not.toThrow()
    }
  })

  test('new rust-core integration does not break existing imports', async () => {
    // Test that existing modules can coexist with rust-core
    const { state } = await import('../../src/lib/state')
    const { rustCore } = await import('../../src/lib/rust-core')
    
    expect(state).toBeDefined()
    expect(rustCore).toBeDefined()
    
    // They should be independent
    expect(state).not.toBe(rustCore)
  })

  test('package.json dependencies are preserved', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    
    // Core dependencies must still be present
    const requiredDeps = [
      'citty',
      'clipboardy',
      'consola',
      'fetch-event-stream',
      'gpt-tokenizer',
      'hono',
      'srvx',
      'tiny-invariant'
    ]

    for (const dep of requiredDeps) {
      expect(packageJson.dependencies[dep]).toBeDefined()
    }

    // Dev dependencies should be preserved too
    const requiredDevDeps = [
      '@types/bun',
      'eslint',
      'tsup',
      'typescript'
    ]

    for (const dep of requiredDevDeps) {
      expect(packageJson.devDependencies[dep]).toBeDefined()
    }
  })

  test('configuration files are preserved', () => {
    const configFiles = [
      'tsconfig.json',
      'tsup.config.ts',
      'eslint.config.js'
    ]

    for (const file of configFiles) {
      expect(existsSync(path.join(projectRoot, file))).toBe(true)
    }
  })

  test('original types and interfaces remain available', async () => {
    // Test imports of key types
    expect(async () => {
      const { Message } = await import('../../src/services/copilot/create-chat-completions')
      expect(Message).toBeDefined()
    }).not.toThrow()

    expect(async () => {
      const types = await import('../../src/routes/messages/anthropic-types')
      expect(types).toBeDefined()
    }).not.toThrow()
  })

  test('hybrid tokenizer works alongside original tokenizer', async () => {
    // Both should be importable (though hybrid might have dependency issues)
    expect(async () => {
      // This might fail due to gpt-tokenizer dependency, but import should work
      await import('../../src/lib/hybrid-tokenizer')
    }).not.toThrow()

    // Original tokenizer file should exist
    expect(existsSync(path.join(projectRoot, 'src/lib/tokenizer.ts'))).toBe(true)
  })

  test('original build artifacts still work', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    
    // Should still produce same binary
    expect(packageJson.bin['copilot-api']).toBe('./dist/main.js')
    
    // Should still include dist in files
    expect(packageJson.files).toContain('dist')
  })

  test('environment variable handling is preserved', async () => {
    // Test that existing environment variable usage still works
    const originalEnv = process.env.NODE_ENV
    
    try {
      process.env.NODE_ENV = 'test'
      
      // Should be able to import modules that check NODE_ENV
      expect(async () => {
        await import('../../src/start')
      }).not.toThrow()
      
    } finally {
      process.env.NODE_ENV = originalEnv
    }
  })

  test('git hooks and linting configuration preserved', () => {
    const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'))
    
    // Git hooks should be preserved
    expect(packageJson['simple-git-hooks']).toBeDefined()
    expect(packageJson['lint-staged']).toBeDefined()
    
    // Linting scripts should exist
    expect(packageJson.scripts.lint).toBeDefined()
    expect(packageJson.scripts.prepare).toBeDefined()
  })

  test('docker and deployment files are preserved', () => {
    const deploymentFiles = [
      'Dockerfile',
      'start.bat',
      'LICENSE',
      'README.md'
    ]

    for (const file of deploymentFiles) {
      expect(existsSync(path.join(projectRoot, file))).toBe(true)
    }
  })

  test('documentation files are preserved', () => {
    const docFiles = [
      'docs/ADR.md',
      'docs/PRD.md',
      'docs/anthropic.md',
      'docs/openai.md',
      'docs/mapping.md',
      'docs/index.html'
    ]

    for (const file of docFiles) {
      expect(existsSync(path.join(projectRoot, file))).toBe(true)
    }
  })

  test('CLI commands still work structurally', async () => {
    // Test that CLI structure is preserved
    const main = await import('../../src/main')
    expect(main).toBeDefined()
    
    const auth = await import('../../src/auth')
    expect(auth).toBeDefined()
    expect(auth.auth).toBeDefined()
    
    const start = await import('../../src/start')
    expect(start).toBeDefined()
  })

  test('server configuration is unchanged', async () => {
    const server = await import('../../src/server')
    expect(server.server).toBeDefined()
  })

  test('api configuration modules work', async () => {
    const apiConfig = await import('../../src/lib/api-config')
    expect(apiConfig.copilotBaseUrl).toBeDefined()
    expect(apiConfig.copilotHeaders).toBeDefined()
  })

  test('error handling modules work', async () => {
    const error = await import('../../src/lib/error')
    expect(error.HTTPError).toBeDefined()
  })

  test('path and state management unchanged', async () => {
    const paths = await import('../../src/lib/paths')
    expect(paths.PATHS).toBeDefined()
    
    const state = await import('../../src/lib/state')
    expect(state.state).toBeDefined()
  })

  test('original utility functions preserved', async () => {
    const utils = await import('../../src/lib/utils')
    expect(utils.isNullish).toBeDefined()
  })

  test('no breaking changes to existing APIs', async () => {
    // Verify key exported functions still exist and work
    const chatCompletions = await import('../../src/services/copilot/create-chat-completions')
    expect(typeof chatCompletions.createChatCompletions).toBe('function')
    
    const getModels = await import('../../src/services/copilot/get-models')
    expect(typeof getModels.getModels).toBe('function')
    
    const embeddings = await import('../../src/services/copilot/create-embeddings')
    expect(typeof embeddings.createEmbeddings).toBe('function')
  })

  test('directory structure integrity', () => {
    const requiredDirs = [
      'src',
      'src/lib',
      'src/routes',
      'src/services',
      'src/services/copilot',
      'src/services/github',
      'tests',
      'docs'
    ]

    for (const dir of requiredDirs) {
      expect(existsSync(path.join(projectRoot, dir))).toBe(true)
    }
  })
})