/**
 * dsh-web-search-switch — host half.
 *
 * Registers one `ctx.web` search provider per third-party backend, so the
 * harness `web_search` tool can run on whichever service the user picks in
 * Settings > Built-in plugins > Web search switch. The official DeepSeek
 * providers stay owned by their own built-in rows; this package only adds
 * alternatives and never changes `web.searchProvider` by itself.
 *
 * Design notes:
 * - Every backend id is prefixed with `search-` so it can never collide with a
 *   built-in provider (`deepseek-official`, `deepseek-search-api`, ...) or with
 *   `dsh-web-search-ollama`'s bare `ollama` id.
 * - `available()` answers for the capability, not for the credential: a
 *   provider whose key is missing still resolves, and `search()` throws a
 *   descriptive `WEB_PROVIDER_CREDENTIAL_MISSING` that names the settings page.
 *   This matches the shipped DeepSeek provider and avoids the seam's opaque
 *   "configured but unavailable" error.
 * - Configuration is read through the volatile refs on every call, so a
 *   settings write applies to the very next search without a restart.
 *
 * @module dsh-web-search-switch
 */

import z from '@deepseek-ai/schemastery'
import { credentialRef } from '@deepseek-ai/dsh-credentials'
import { launchEnvironmentOf } from '@deepseek-ai/dsh-launch-environment'
import { WebError } from '@deepseek-ai/dsh-web'

/** Cordis plugin name used by loader diagnostics. */
export const name = 'web-search-switch'

/** The web seam this provider pack registers into. */
export const inject = ['web']

/** Settings entry id (also the client tab's namespace and slot id). */
export const ENTRY_ID = 'web-search-switch'

/** The settings page path quoted in error messages. */
const SETTINGS_HINT = '设置 → 内置插件 → 网页搜索 切换（Settings > Built-in plugins > Web search switch）'

/** User agent sent on every search request. */
const USER_AGENT = 'dsh-web-search-switch/0.1.0'

/** Hard caps shared by every backend. */
const MAX_RESULTS_MIN = 1
const MAX_RESULTS_MAX = 20
const DEFAULT_MAX_RESULTS = 5
const DEFAULT_TIMEOUT_MS = 20000

/** Per-backend defaults; mirrored by the browser half's catalog. */
export const PROVIDERS = [
  {
    id: 'search-ollama',
    label: 'Ollama Web Search',
    keyField: 'ollamaApiKeyEnv',
    defaultKeyEnv: 'OLLAMA_API_KEY',
    baseURLField: 'ollamaBaseURL',
    defaultBaseURL: 'https://ollama.com/api/web_search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({ query, max_results: max }),
        },
      }
    },
    extract(body) {
      return asArray(body?.results).map((item) => ({
        url: item?.url,
        title: item?.title,
        snippet: item?.content,
      }))
    },
  },
  {
    id: 'search-tavily',
    label: 'Tavily',
    keyField: 'tavilyApiKeyEnv',
    defaultKeyEnv: 'TAVILY_API_KEY',
    baseURLField: 'tavilyBaseURL',
    defaultBaseURL: 'https://api.tavily.com/search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            query,
            max_results: max,
            search_depth: 'basic',
            include_answer: false,
            include_raw_content: false,
            include_images: false,
          }),
        },
      }
    },
    extract(body) {
      return asArray(body?.results).map((item) => ({
        url: item?.url,
        title: item?.title,
        snippet: item?.content,
      }))
    },
  },
  {
    id: 'search-brave',
    label: 'Brave Search',
    keyField: 'braveApiKeyEnv',
    defaultKeyEnv: 'BRAVE_API_KEY',
    baseURLField: 'braveBaseURL',
    defaultBaseURL: 'https://api.search.brave.com/res/v1/web/search',
    build({ query, max, base, key }) {
      const url = `${base}?q=${encodeURIComponent(query)}&count=${max}&text_decorations=false`
      return {
        url,
        init: {
          method: 'GET',
          headers: {
            'X-Subscription-Token': key,
            accept: 'application/json',
          },
        },
      }
    },
    extract(body) {
      return asArray(body?.web?.results).map((item) => ({
        url: item?.url,
        title: item?.title,
        snippet: item?.description,
      }))
    },
  },
  {
    id: 'search-exa',
    label: 'Exa',
    keyField: 'exaApiKeyEnv',
    defaultKeyEnv: 'EXA_API_KEY',
    baseURLField: 'exaBaseURL',
    defaultBaseURL: 'https://api.exa.ai/search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            query,
            numResults: max,
            type: 'auto',
            contents: { text: { maxCharacters: 1200 } },
          }),
        },
      }
    },
    extract(body) {
      return asArray(body?.results).map((item) => ({
        url: item?.url,
        title: item?.title,
        snippet: item?.text ?? item?.summary,
      }))
    },
  },
  {
    id: 'search-serper',
    label: 'Serper (Google)',
    keyField: 'serperApiKeyEnv',
    defaultKeyEnv: 'SERPER_API_KEY',
    baseURLField: 'serperBaseURL',
    defaultBaseURL: 'https://google.serper.dev/search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            'X-API-KEY': key,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({ q: query, num: max }),
        },
      }
    },
    extract(body) {
      return asArray(body?.organic).map((item) => ({
        url: item?.link,
        title: item?.title,
        snippet: item?.snippet,
      }))
    },
  },
  {
    id: 'search-bocha',
    label: '博查 Bocha',
    keyField: 'bochaApiKeyEnv',
    defaultKeyEnv: 'BOCHA_API_KEY',
    baseURLField: 'bochaBaseURL',
    defaultBaseURL: 'https://api.bochaai.com/v1/web-search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({ query, count: max, summary: true }),
        },
      }
    },
    extract(body) {
      return asArray(body?.data?.webPages?.value).map((item) => ({
        url: item?.url,
        title: item?.name,
        snippet: item?.summary ?? item?.snippet,
      }))
    },
  },
  {
    id: 'search-zhipu',
    label: '智谱 Web Search',
    keyField: 'zhipuApiKeyEnv',
    defaultKeyEnv: 'ZHIPU_API_KEY',
    baseURLField: 'zhipuBaseURL',
    defaultBaseURL: 'https://open.bigmodel.cn/api/paas/v4/web_search',
    build({ query, max, base, key }) {
      return {
        url: base,
        init: {
          method: 'POST',
          headers: {
            authorization: `Bearer ${key}`,
            'content-type': 'application/json',
            accept: 'application/json',
          },
          body: JSON.stringify({
            search_query: query,
            search_engine: 'search_std',
            count: max,
          }),
        },
      }
    },
    extract(body) {
      return asArray(body?.search_result).map((item) => ({
        url: item?.link,
        title: item?.title,
        snippet: item?.content,
      }))
    },
  },
  {
    id: 'search-searxng',
    label: 'SearXNG',
    keyField: 'searxngApiKeyEnv',
    defaultKeyEnv: 'SEARXNG_API_KEY',
    baseURLField: 'searxngBaseURL',
    defaultBaseURL: '',
    optionalKey: true,
    build({ query, max, base, key }) {
      const root = base.replace(/\/+$/u, '')
      const url = `${root}/search?q=${encodeURIComponent(query)}&format=json&safesearch=0&language=auto&count=${max}`
      return {
        url,
        init: {
          method: 'GET',
          headers: {
            accept: 'application/json',
            ...(key === undefined ? {} : { authorization: `Bearer ${key}` }),
          },
        },
      }
    },
    extract(body) {
      return asArray(body?.results).map((item) => ({
        url: item?.url,
        title: item?.title,
        snippet: item?.content,
      }))
    },
  },
]

/** Ids this plugin registers; the browser half imports the same order. */
export const PROVIDER_IDS = PROVIDERS.map((provider) => provider.id)

/** Fields every backend contributes to the settings form. */
function providerFields(provider) {
  return {
    [provider.keyField]: z
      .string()
      .role('credential-ref')
      .default(provider.defaultKeyEnv)
      .volatile(),
    [provider.baseURLField]: z
      .string()
      .default(provider.defaultBaseURL)
      .volatile(),
  }
}

/**
 * Plugin configuration. Every field is volatile so the settings service can
 * project it into the form; secret VALUES never live here, only credential
 * references written by the settings page through the credentials domain.
 */
export const Config = z.object({
  maxResults: z
    .number()
    .step(1)
    .min(MAX_RESULTS_MIN)
    .max(MAX_RESULTS_MAX)
    .default(DEFAULT_MAX_RESULTS)
    .volatile(),
  timeoutMs: z
    .number()
    .step(1000)
    .min(5000)
    .max(120000)
    .default(DEFAULT_TIMEOUT_MS)
    .volatile(),
  ...Object.assign({}, ...PROVIDERS.map(providerFields)),
})

/** Snapshot the live config into plain values for one search. */
function optionsOf(config) {
  const readString = (ref, fallback) => {
    const value = ref?.get?.()
    return typeof value === 'string' && value.length > 0 ? value : fallback
  }
  const readNumber = (ref, fallback) => {
    const value = ref?.get?.()
    return Number.isFinite(value) ? value : fallback
  }
  const maxResults = Math.min(
    MAX_RESULTS_MAX,
    Math.max(MAX_RESULTS_MIN, Math.trunc(readNumber(config.maxResults, DEFAULT_MAX_RESULTS)) || DEFAULT_MAX_RESULTS),
  )
  const timeoutMs = readNumber(config.timeoutMs, DEFAULT_TIMEOUT_MS)
  return {
    maxResults,
    timeoutMs: timeoutMs >= 5000 ? timeoutMs : DEFAULT_TIMEOUT_MS,
    backends: PROVIDERS.map((provider) => ({
      provider,
      keyEnv: readString(config[provider.keyField], provider.defaultKeyEnv),
      baseURL: readString(config[provider.baseURLField], provider.defaultBaseURL),
    })),
  }
}

/** One search provider bound to a single backend descriptor. */
class BackendSearchProvider {
  /**
   * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
   * @param {() => ReturnType<typeof optionsOf>} snapshot - live options reader.
   * @param {(typeof PROVIDERS)[number]} descriptor - backend wire contract.
   */
  constructor(ctx, snapshot, descriptor) {
    this.ctx = ctx
    this.snapshot = snapshot
    this.descriptor = descriptor
    this.id = descriptor.id
  }

  /** The capability is registered and callable; a missing key fails at search time. */
  available() {
    return true
  }

  /**
   * Run one search through this backend.
   * @param {{ query: string, maxResults?: number }} request - the seam request.
   * @param {AbortSignal | undefined} signal - caller cancellation.
   * @returns {Promise<{ sources: Array<{ url: string, title?: string, snippet?: string }>, truncated: boolean }>}
   */
  async search(request, signal) {
    const options = this.snapshot()
    const backend = options.backends.find((entry) => entry.provider.id === this.id)
    if (backend === undefined) {
      throw new WebError(`web search backend "${this.id}" is no longer configured`, 'WEB_PROVIDER_ERROR')
    }

    const key = await resolveKey(this.ctx, backend.keyEnv, signal)
    if (key === undefined && backend.provider.optionalKey !== true) {
      throw new WebError(
        `${backend.provider.label} 搜索还没有配置 API Key（${backend.keyEnv}）。请打开 ${SETTINGS_HINT} 填入密钥，或先切换到其他搜索源。`,
        'WEB_PROVIDER_CREDENTIAL_MISSING',
      )
    }
    if (backend.provider.optionalKey === true && !isParsableURL(backend.baseURL)) {
      throw new WebError(
        `SearXNG 搜索需要先填写自建实例地址。请打开 ${SETTINGS_HINT}，在高级设置里填写实例地址（例如 https://searx.example.com）。`,
        'WEB_PROVIDER_ERROR',
      )
    }
    if (!isParsableURL(backend.baseURL)) {
      throw new WebError(
        `${backend.provider.label} 的接口地址无效（${JSON.stringify(backend.baseURL)}）。请打开 ${SETTINGS_HINT} 检查高级设置里的接口地址。`,
        'WEB_PROVIDER_ERROR',
      )
    }

    const requestSpec = backend.provider.build({
      query: request.query,
      max: Math.min(options.maxResults, request.maxResults ?? options.maxResults),
      base: backend.baseURL,
      key,
    })
    const body = await requestJson(requestSpec, options.timeoutMs, signal, backend.provider.label)
    const sources = backend.provider
      .extract(body)
      .filter((item) => typeof item.url === 'string' && item.url.length > 0)
      .map((item) => ({
        url: item.url,
        ...(typeof item.title === 'string' && item.title.length > 0 ? { title: item.title } : {}),
        ...(typeof item.snippet === 'string' && item.snippet.length > 0 ? { snippet: item.snippet } : {}),
      }))
    return { sources: sources.slice(0, options.maxResults), truncated: false }
  }
}

/**
 * Resolve one backend's API key: the credentials service first (it layers the
 * stored value over the launching environment), then the launch environment.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {string} ref - credential reference name.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @returns {Promise<string | undefined>} the key, or undefined when absent.
 */
async function resolveKey(ctx, ref, signal) {
  throwIfAborted(signal)
  let name
  try {
    name = credentialRef(ref)
  } catch {
    throw new WebError(
      `"${ref}" 不是合法的凭据引用名（需要形如 TAVILY_API_KEY）。请打开 ${SETTINGS_HINT} 检查设置。`,
      'WEB_PROVIDER_ERROR',
    )
  }
  const credentials = ctx.get('credentials')
  if (credentials !== undefined) {
    try {
      const hit = await credentials.resolve(name)
      if (hit !== undefined && typeof hit.value === 'string' && hit.value.length > 0) return hit.value
    } catch (error) {
      if (signalOrAbort(signal, error)) throw aborted(signal, error)
      // Fall through to the launch environment: a broken store must not hide
      // a key that the launching process exported.
    }
  }
  try {
    const ambient = launchEnvironmentOf(ctx)?.get(name)
    if (ambient !== undefined && typeof ambient.value === 'string' && ambient.value.length > 0) return ambient.value
  } catch {
    // No launch-environment service in this composition.
  }
  const fromProcess = typeof process !== 'undefined' ? process.env[name] : undefined
  return typeof fromProcess === 'string' && fromProcess.length > 0 ? fromProcess : undefined
}

/**
 * Dispatch one JSON request with a deadline and the caller's cancellation.
 * @param {{ url: string, init: RequestInit }} spec - request built by the backend.
 * @param {number} timeoutMs - per-search deadline.
 * @param {AbortSignal | undefined} signal - caller cancellation.
 * @param {string} label - backend label for error copy.
 * @returns {Promise<any>} the parsed JSON body.
 */
async function requestJson(spec, timeoutMs, signal, label) {
  throwIfAborted(signal)
  const guard = createDeadline(signal, timeoutMs)
  let response
  try {
    response = await fetch(spec.url, {
      ...spec.init,
      headers: {
        'user-agent': USER_AGENT,
        ...(spec.init.headers ?? {}),
      },
      signal: guard.signal,
    })
  } catch (error) {
    if (signal?.aborted === true) throw aborted(signal, error)
    if (guard.timedOut() || error?.name === 'TimeoutError') {
      throw new WebError(`${label} 搜索超时（${Math.round(timeoutMs / 1000)} 秒）。可以在设置里调大超时时间。`, 'WEB_PROVIDER_ERROR', { cause: error })
    }
    throw new WebError(`${label} 搜索请求失败：${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
  } finally {
    guard.dispose()
  }

  if (!response.ok) {
    let detail = ''
    try {
      const text = await response.text()
      if (text.length > 0) {
        try {
          const parsed = JSON.parse(text)
          const message = parsed?.error?.message ?? parsed?.error ?? parsed?.message ?? parsed?.detail
          detail = typeof message === 'string' && message.length > 0 ? `：${message}` : `：${text.slice(0, 300)}`
        } catch {
          detail = `：${text.slice(0, 300)}`
        }
      }
    } catch {
      // The status alone still names the failure.
    }
    throw new WebError(`${label} 搜索服务返回 HTTP ${response.status}${detail}`, 'WEB_PROVIDER_ERROR')
  }

  try {
    return await response.json()
  } catch (error) {
    throw new WebError(`${label} 搜索服务返回了无法解析的响应：${String(error)}`, 'WEB_PROVIDER_ERROR', { cause: error })
  }
}

/**
 * One request's deadline plus the caller's signal, normalized so timeout and
 * cancellation stay distinguishable.
 * @param {AbortSignal | undefined} caller - the seam's signal.
 * @param {number} timeoutMs - deadline in milliseconds.
 */
function createDeadline(caller, timeoutMs) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    controller.abort(timeoutError(timeoutMs))
  }, timeoutMs)
  if (typeof timer.unref === 'function') timer.unref()

  const onCallerAbort = () => controller.abort(caller.reason)
  if (caller !== undefined) {
    if (caller.aborted) onCallerAbort()
    else caller.addEventListener('abort', onCallerAbort, { once: true })
  }

  return {
    signal: controller.signal,
    timedOut: () => timedOut,
    dispose() {
      clearTimeout(timer)
      if (caller !== undefined) caller.removeEventListener('abort', onCallerAbort)
    },
  }
}

/** @returns {Error} an abort reason shaped like `AbortSignal.timeout`. */
function timeoutError(timeoutMs) {
  const reason = new Error(`search timed out after ${timeoutMs}ms`)
  reason.name = 'TimeoutError'
  return reason
}

/** @returns {boolean} true when the caller cancelled or the error is an abort. */
function signalOrAbort(signal, error) {
  return signal?.aborted === true || error?.name === 'AbortError'
}

/** @returns {WebError} the seam's stable cancellation error. */
function aborted(signal, cause) {
  return new WebError('web search aborted', 'WEB_ABORTED', { cause: cause ?? signal?.reason })
}

function throwIfAborted(signal) {
  if (signal?.aborted === true) throw aborted(signal)
}

function asArray(value) {
  return Array.isArray(value) ? value : []
}

function isParsableURL(value) {
  if (typeof value !== 'string' || value.length === 0) return false
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

/**
 * Register every third-party provider on the web seam.
 * @param {import('@deepseek-ai/cordis').Context} ctx - plugin context.
 * @param {any} config - the resolved configuration refs.
 */
export function apply(ctx, config) {
  const snapshot = () => optionsOf(config)
  for (const descriptor of PROVIDERS) {
    ctx.web.registerSearchProvider(new BackendSearchProvider(ctx, snapshot, descriptor))
  }
}

export default { name, inject, Config, apply }
