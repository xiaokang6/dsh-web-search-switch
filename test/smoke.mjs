import assert from 'node:assert/strict'

const mod = await import('file:///D:/Ai/chajian/dsh-web-search-switch/lib/index.js')

/** Minimal ctx: two registries, credentials with a key, no launch env service. */
function makeContext({ withKey = true } = {}) {
  const search = new Map()
  const fetch = new Map()
  const ctx = {
    web: {
      registerSearchProvider(provider) {
        search.set(provider.id, provider)
        return () => {}
      },
      registerFetchProvider(provider) {
        fetch.set(provider.id, provider)
        return () => {}
      },
    },
    get(name) {
      if (name !== 'credentials') return undefined
      return {
        resolve: async (name) => (withKey && name === 'OLLAMA_API_KEY' ? { value: 'test-key' } : undefined),
      }
    },
    effect() {
      return () => {}
    },
  }
  return { ctx, search, fetch }
}

/** Every config ref reads as "unset", so defaults apply. */
const config = new Proxy({}, { get: () => ({ get: () => undefined }) })

const calls = []
globalThis.fetch = async (url, init) => {
  calls.push({ url, init })
  return new Response(JSON.stringify({ title: 'Example Domain', content: 'hello body', links: ['https://example.com/'] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
}

// 1. registration
const { ctx, search, fetch } = makeContext()
mod.apply(ctx, config)
assert.deepEqual([...fetch.keys()], ['fetch-ollama'], 'registers the Ollama fetch provider')
assert.equal([...search.keys()].length, 8, 'still registers the eight search providers')

// 2. fetch request/response mapping
const provider = fetch.get('fetch-ollama')
assert.equal(provider.available(), true)
const result = await provider.fetch({ url: 'https://example.com' }, undefined)

assert.equal(calls[0].url, 'https://ollama.com/api/web_fetch', 'posts to the Ollama fetch endpoint')
assert.equal(calls[0].init.method, 'POST')
assert.equal(calls[0].init.headers.authorization, 'Bearer test-key', 'sends the resolved key as Bearer')
assert.deepEqual(JSON.parse(calls[0].init.body), { url: 'https://example.com' })
assert.equal(result.url, 'https://example.com')
assert.equal(result.statusCode, 200)
assert.equal(result.body.kind, 'text')
assert.match(result.body.content, /# Example Domain/, 'prepends the page title')
assert.match(result.body.content, /hello body/, 'keeps the extracted content')
assert.equal(result.truncated, false)

// 3. missing credential fails with the seam's stable code
const noKey = makeContext({ withKey: false })
mod.apply(noKey.ctx, config)
await assert.rejects(
  () => noKey.fetch.get('fetch-ollama').fetch({ url: 'https://example.com' }, undefined),
  (error) => error.code === 'WEB_PROVIDER_CREDENTIAL_MISSING',
)

// 4. non-2xx becomes a WebError with the status in the message
globalThis.fetch = async () => new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
await assert.rejects(
  () => provider.fetch({ url: 'https://example.com' }, undefined),
  (error) => error.code === 'WEB_PROVIDER_ERROR' && /HTTP 401/.test(error.message),
)

// 5. malformed payload is reported, not silently accepted
globalThis.fetch = async () => new Response(JSON.stringify({ title: 'x' }), { status: 200 })
await assert.rejects(
  () => provider.fetch({ url: 'https://example.com' }, undefined),
  (error) => error.code === 'WEB_PROVIDER_ERROR' && /content/.test(error.message),
)

// 6. the existing Ollama search provider still works through the same plumbing
globalThis.fetch = async () =>
  new Response(JSON.stringify({ results: [{ title: 'T', url: 'https://a.example', content: 'S' }] }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  })
const searched = await search.get('search-ollama').search({ query: 'hello' }, undefined)
assert.equal(searched.sources.length, 1)
assert.deepEqual(searched.sources[0], { url: 'https://a.example', title: 'T', snippet: 'S' })

console.log('all smoke tests passed')
