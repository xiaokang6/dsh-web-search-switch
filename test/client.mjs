/**
 * Headless render smoke test for the browser half.
 *
 * The bundle is a lazy-CJS factory that only needs `react`, so this harness
 * supplies a tiny hooks runtime instead of a real renderer: it catches
 * undefined identifiers, broken trees, and 鈥?most importantly 鈥?checks that
 * picking a fetch source and pressing Save writes `web.fetchProvider`.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8')

let factory = null
globalThis.window = {
  __ModuleLoader__: {
    load({ factory: register }) {
      factory = register
    },
  },
}
globalThis.document = {
  head: { appendChild() {} },
  createElement: () => ({ dataset: {} }),
  querySelector: () => null,
}

new Function(source)()
assert.ok(factory, 'the bundle registered itself')

// ---- tiny hooks runtime -------------------------------------------------
let hookState = []
let hookIndex = 0
let dirty = false
let effects = []

const React = {
  createElement(type, props, ...children) {
    return {
      type,
      props: { ...(props ?? {}), children: children.flat(Infinity).filter((c) => c !== null && c !== undefined && c !== false) },
    }
  },
  useState(initial) {
    const i = hookIndex++
    if (!(i in hookState)) hookState[i] = typeof initial === 'function' ? initial() : initial
    return [
      hookState[i],
      (value) => {
        hookState[i] = typeof value === 'function' ? value(hookState[i]) : value
        dirty = true
      },
    ]
  },
  useCallback(fn) {
    hookIndex++
    return fn
  },
  useEffect(fn) {
    hookIndex++
    effects.push(fn)
  },
  useSyncExternalStore(_subscribe, get) {
    hookIndex++
    return get()
  },
}

const exports = factory((name) => {
  assert.equal(name, 'react')
  return React
})

// ---- plugin context -----------------------------------------------------
const calls = { webSet: [], credSet: [] }

const webForm = {
  subscribe: () => () => {},
  getSnapshot: () => ({
    status: 'ready',
    writable: true,
    value: { searchProvider: 'search-ollama', fetchProvider: 'deepseek-fetch-api' },
    base: { maxResults: 5, timeoutMs: 20000 },
  }),
  set: async (field, value) => {
    calls.webSet.push([field, value])
    return true
  },
  unset: async () => true,
}

const mineForm = {
  subscribe: () => () => {},
  getSnapshot: () => ({ status: 'ready', writable: true, value: {}, base: { maxResults: 5, timeoutMs: 20000 } }),
  set: async () => true,
  unset: async () => true,
}

let registered = null
const ctx = {
  get: () => undefined,
  effect: () => () => {},
  locale: { register: () => () => {}, bind: () => (key) => key },
  configForms: { get: (id) => (id === 'web' ? webForm : mineForm) },
  remote: {
    credentials: {
      describe: async () => ({ ok: true, value: {} }),
      set: async (ref, value) => {
        calls.credSet.push([ref, value])
        return { ok: true }
      },
    },
  },
  slots: {
    inject: (_slot, make) => make(),
    register: (_config, render) => {
      if (registered === null) registered = render
      return { dispose() {} }
    },
  },
}

exports.apply(ctx)
assert.ok(typeof registered === 'function')

// ---- render, choose Ollama fetch, save -----------------------------------
function evaluate(node) {
  return typeof node?.type === "function" ? evaluate(node.type(node.props)) : node
}

function render() {
  hookIndex = 0
  effects = []
  dirty = false
  const tree = evaluate(registered({ view: "page", t: (key) => key }))
  for (const effect of effects) effect()
  return tree
}

function walk(node, visit) {
  if (node === null || node === undefined || typeof node !== 'object') return
  visit(node)
  for (const child of node.props?.children ?? []) walk(child, visit)
}

const first = render()
const radios = []
walk(first, (node) => {
  if (node.type === 'input' && node.props?.type === 'radio') radios.push(node)
})
const fetchRadios = radios.filter((node) => node.props.name === 'wss-fetch')
assert.equal(fetchRadios.length, 3, 'renders three fetch options (http, ollama, deepseek)')

function textOf(node) {
  if (typeof node === "string") return node
  return (node?.props?.children ?? []).map(textOf).join("")
}

let ollamaRadio = null
walk(first, (node) => {
  if (node.type === "label" && textOf(node).includes("Ollama")) {
    walk(node, (inner) => {
      if (inner.type === "input" && inner.props?.name === "wss-fetch") ollamaRadio = inner
    })
  }
})
assert.ok(ollamaRadio, "the Ollama fetch option is selectable")
ollamaRadio.props.onChange()
render()

const buttons = []
walk(render(), (node) => {
  if (node.type === 'button') buttons.push(node)
})
const save = buttons.find((node) => String(node.props.className).includes('wss-btn-primary'))
assert.ok(save, 'renders a save button')
assert.equal(save.props.disabled, false, 'save is enabled once a fetch source is staged')
save.props.onClick()
await new Promise((resolve) => setTimeout(resolve, 0))

assert.deepEqual(
  calls.webSet.find(([field]) => field === 'fetchProvider'),
  ['fetchProvider', 'fetch-ollama'],
  'saving writes web.fetchProvider',
)

console.log('client smoke test passed')





