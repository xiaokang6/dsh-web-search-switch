/**
 * dsh-web-search-switch — browser half.
 *
 * A hand-written client bundle in the shell's lazy-CJS format: the module
 * system registers this factory through `window.__ModuleLoader__.load`, and
 * the Cordis loader treats the returned exports as an ordinary browser plugin.
 * It requires only `react` from the platform seed table, exactly like
 * `dsh-cline-pass`'s browser half.
 *
 * The tab lives in Settings > Built-in plugins. It writes the live provider
 * selection into the `web` entry (`web.searchProvider`) through the shared
 * configuration-form service, and stores API keys through the credentials
 * domain — never in the settings document.
 *
 * @module dsh-web-search-switch/client
 */

window.__ModuleLoader__.load({
  id: 'dsh-web-search-switch',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' })

    const React = require('react')
    const h = React.createElement

    /** Locale namespace owned by this card. */
    const NS = 'web-search-switch'
    /** Host settings entry id this plugin owns (its namespace). */
    const ENTRY_ID = 'web-search-switch'

    /**
     * The selectable targets. The first two are owned by the host's built-in
     * rows; the rest are registered by this package's host half. Field names
     * must stay in sync with `lib/index.js`.
     */
    const CATALOG = [
      {
        id: 'deepseek-official',
        labelKey: 'pOfficialMessages',
        hintKey: 'hOfficialMessages',
        official: true,
        ref: 'DEEPSEEK_API_KEY',
      },
      {
        id: 'deepseek-search-api',
        labelKey: 'pOfficialApi',
        hintKey: 'hOfficialApi',
        official: true,
        ref: 'DEEPSEEK_API_KEY',
      },
      {
        id: 'search-ollama',
        labelKey: 'pOllama',
        hintKey: 'hOllama',
        ref: 'OLLAMA_API_KEY',
        keyField: 'ollamaApiKeyEnv',
        baseField: 'ollamaBaseURL',
      },
      {
        id: 'search-tavily',
        labelKey: 'pTavily',
        hintKey: 'hTavily',
        ref: 'TAVILY_API_KEY',
        keyField: 'tavilyApiKeyEnv',
        baseField: 'tavilyBaseURL',
      },
      {
        id: 'search-brave',
        labelKey: 'pBrave',
        hintKey: 'hBrave',
        ref: 'BRAVE_API_KEY',
        keyField: 'braveApiKeyEnv',
        baseField: 'braveBaseURL',
      },
      {
        id: 'search-exa',
        labelKey: 'pExa',
        hintKey: 'hExa',
        ref: 'EXA_API_KEY',
        keyField: 'exaApiKeyEnv',
        baseField: 'exaBaseURL',
      },
      {
        id: 'search-serper',
        labelKey: 'pSerper',
        hintKey: 'hSerper',
        ref: 'SERPER_API_KEY',
        keyField: 'serperApiKeyEnv',
        baseField: 'serperBaseURL',
      },
      {
        id: 'search-bocha',
        labelKey: 'pBocha',
        hintKey: 'hBocha',
        ref: 'BOCHA_API_KEY',
        keyField: 'bochaApiKeyEnv',
        baseField: 'bochaBaseURL',
      },
      {
        id: 'search-zhipu',
        labelKey: 'pZhipu',
        hintKey: 'hZhipu',
        ref: 'ZHIPU_API_KEY',
        keyField: 'zhipuApiKeyEnv',
        baseField: 'zhipuBaseURL',
      },
      {
        id: 'search-searxng',
        labelKey: 'pSearxng',
        hintKey: 'hSearxng',
        ref: 'SEARXNG_API_KEY',
        keyField: 'searxngApiKeyEnv',
        baseField: 'searxngBaseURL',
        optionalKey: true,
      },
    ]

    const byId = (id) => CATALOG.find((entry) => entry.id === id)
    const currentOf = (snapshot) => snapshot?.value?.searchProvider ?? snapshot?.base?.searchProvider ?? 'deepseek-official'
    const writableOf = (snapshot) => snapshot?.writable !== false

    const zh = {
      title: '搜索源',
      summary: '在内置的 DeepSeek 官方搜索与第三方搜索 API 之间切换。',
      intro: '选择 web_search 使用的搜索源。切换会写入当前配置，下一次搜索立即生效，无需重启。',
      current: '当前生效',
      provider: '搜索提供方',
      configured: '已配置密钥',
      notConfigured: '未配置密钥',
      optionalKey: '密钥可选',
      builtin: '内置',
      unknownProvider: '未知提供方',
      keyLabel: 'API Key',
      keyHint: '密钥保存在凭据库里，不写入配置文件。',
      keyPlaceholder: '粘贴 API Key',
      keySetPlaceholder: '已配置；留空则保持不变',
      keyReadOnly: '当前部署不允许写入凭据。',
      baseLabel: '接口地址',
      baseHint: '留空恢复默认地址。',
      maxResults: '每次结果数',
      maxResultsHint: '1–20，默认 5。',
      timeout: '超时（毫秒）',
      timeoutHint: '5000–120000，默认 20000。',
      advanced: '高级设置',
      save: '保存',
      discard: '撤销',
      saving: '保存中…',
      saved: '已保存，下一次搜索生效。',
      pendingSwitch: '尚未保存：保存后切换到「{0}」。',
      saveFailed: '保存失败',
      readOnly: '本部署的设置为只读。',
      loading: '正在读取设置…',
      unavailable: '设置服务尚未就绪：找不到 web 或本插件的配置命名空间。',
      noSearchProvider: '当前没有可用的搜索源。',
      refresh: '刷新状态',
      officialNote: '由内置插件提供，无需在这里填写密钥。',
      accountNote: '使用 DeepSeek 账号登录的对话可直接搜索。',
      reloadNote: '切换后无需重启；如果正在进行的搜索已经发出，它会使用原来的搜索源完成。',
      invalidNumber: '请填写范围内的整数。',
      invalidBase: '接口地址必须以 http:// 或 https:// 开头。',
    }

    const en = {
      title: 'Search source',
      summary: 'Switch web_search between the built-in DeepSeek search and third-party search APIs.',
      intro: 'Pick the source web_search uses. Saving writes the current configuration; the next search uses it immediately, no restart needed.',
      current: 'Active',
      provider: 'Search provider',
      configured: 'Key configured',
      notConfigured: 'No key',
      optionalKey: 'Key optional',
      builtin: 'Built-in',
      unknownProvider: 'Unknown provider',
      keyLabel: 'API key',
      keyHint: 'Stored in the credentials store, never in the settings file.',
      keyPlaceholder: 'Paste the API key',
      keySetPlaceholder: 'Configured; leave blank to keep it',
      keyReadOnly: 'This deployment does not allow credential writes.',
      baseLabel: 'Endpoint',
      baseHint: 'Leave blank to restore the default endpoint.',
      maxResults: 'Results per search',
      maxResultsHint: '1–20, default 5.',
      timeout: 'Timeout (ms)',
      timeoutHint: '5000–120000, default 20000.',
      advanced: 'Advanced',
      save: 'Save',
      discard: 'Discard',
      saving: 'Saving…',
      saved: 'Saved; the next search uses it.',
      pendingSwitch: 'Not saved yet: saving switches to {0}.',
      saveFailed: 'Save failed',
      readOnly: 'This deployment stores settings read-only.',
      loading: 'Reading settings…',
      unavailable: 'The settings service is not ready: the web or this plugin namespace is missing.',
      noSearchProvider: 'No usable search provider.',
      refresh: 'Refresh status',
      officialNote: 'Provided by a built-in plugin; no key needed here.',
      accountNote: 'Conversations on a DeepSeek Account model can search without a key.',
      reloadNote: 'No restart is needed. A search already in flight finishes on the previous provider.',
      invalidNumber: 'Enter an integer inside the allowed range.',
      invalidBase: 'The endpoint must start with http:// or https://.',
    }

    // Provider copy is shared by both dictionaries and keyed by catalog entry.
    Object.assign(zh, {
      pOfficialMessages: 'DeepSeek 官方 · Messages 搜索',
      hOfficialMessages: '内置默认搜索，通过 DeepSeek Messages 服务端工具完成。',
      pOfficialApi: 'DeepSeek 官方 · 新版搜索 API',
      hOfficialApi: '内置的 DeepSeek Search / Fetch API 提供方。',
      pOllama: 'Ollama Web Search',
      hOllama: 'ollama.com 的 /api/web_search，适合已经在用 Ollama 的场景。',
      pTavily: 'Tavily',
      hTavily: '面向 AI 的搜索 API，自带免费额度。',
      pBrave: 'Brave Search',
      hBrave: 'Brave 独立索引的 Web Search API。',
      pExa: 'Exa',
      hExa: '语义搜索 API，返回正文摘要。',
      pSerper: 'Serper（Google）',
      hSerper: '通过 Serper 调用 Google 搜索结果。',
      pBocha: '博查 Bocha',
      hBocha: '面向中文互联网的搜索 API。',
      pZhipu: '智谱 Web Search',
      hZhipu: '智谱开放平台的 Web 搜索接口。',
      pSearxng: 'SearXNG（自建）',
      hSearxng: '自建元搜索实例，需要填写实例地址；密钥可选。',
    })
    Object.assign(en, {
      pOfficialMessages: 'DeepSeek official · Messages search',
      hOfficialMessages: 'The built-in default, using a DeepSeek Messages server tool.',
      pOfficialApi: 'DeepSeek official · Search API',
      hOfficialApi: 'The built-in DeepSeek Search / Fetch API provider.',
      pOllama: 'Ollama Web Search',
      hOllama: 'ollama.com /api/web_search, for people already running Ollama.',
      pTavily: 'Tavily',
      hTavily: 'A search API built for AI, with a free tier.',
      pBrave: 'Brave Search',
      hBrave: "Brave's independent web index API.",
      pExa: 'Exa',
      hExa: 'Semantic search API returning content excerpts.',
      pSerper: 'Serper (Google)',
      hSerper: 'Google results through the Serper API.',
      pBocha: 'Bocha',
      hBocha: 'A search API focused on the Chinese web.',
      pZhipu: 'Zhipu Web Search',
      hZhipu: 'The Zhipu open-platform web search endpoint.',
      pSearxng: 'SearXNG (self-hosted)',
      hSearxng: 'Your own metasearch instance; endpoint required, key optional.',
    })

    /** Style sheet, injected once per page. */
    const CSS = [
      '.wss-panel{max-width:760px;display:flex;flex-direction:column;gap:14px;color:var(--dsw-alias-label-primary);font-size:13px}',
      '.wss-title{margin:0;font-size:18px;font-weight:600}',
      '.wss-intro{margin:0;color:var(--dsw-alias-label-tertiary);line-height:1.6}',
      '.wss-current{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.wss-current-label{color:var(--dsw-alias-label-tertiary)}',
      '.wss-chip{display:inline-flex;align-items:center;gap:6px;padding:2px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);border:0.5px solid var(--dsw-alias-border-l2);font-size:12px}',
      '.wss-chip-ok{color:var(--dsw-alias-state-success-primary,#2f9e44)}',
      '.wss-chip-warn{color:var(--dsw-alias-state-warning-primary,#e8590c)}',
      '.wss-providers{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:8px}',
      '.wss-provider{display:flex;align-items:flex-start;gap:10px;padding:10px 12px;border:0.5px solid var(--dsw-alias-border-l2);border-radius:10px;background:var(--dsw-alias-bg-layer-1);cursor:pointer}',
      '.wss-provider:hover{border-color:var(--dsw-alias-brand-primary)}',
      '.wss-provider-active{border-color:var(--dsw-alias-brand-primary);box-shadow:0 0 0 1px var(--dsw-alias-brand-primary) inset}',
      '.wss-provider input{margin-top:3px;accent-color:var(--dsw-alias-brand-primary)}',
      '.wss-provider-main{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}',
      '.wss-provider-name{font-weight:600}',
      '.wss-provider-hint{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}',
      '.wss-field{display:flex;flex-direction:column;gap:5px}',
      '.wss-field-row{display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap}',
      '.wss-label{font-weight:500}',
      '.wss-hint{margin:0;color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.5}',
      '.wss-input{background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);border:0.5px solid var(--dsw-alias-border-l2);border-radius:6px;padding:6px 8px;font-size:13px;min-width:0;flex:1}',
      '.wss-input:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}',
      '.wss-input-num{max-width:140px;flex:none}',
      '.wss-actions{display:flex;align-items:center;gap:10px;flex-wrap:wrap}',
      '.wss-btn{border:0.5px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);border-radius:6px;padding:6px 12px;font-size:13px;cursor:pointer}',
      '.wss-btn:hover:not(:disabled){border-color:var(--dsw-alias-brand-primary)}',
      '.wss-btn:disabled{opacity:.5;cursor:default}',
      '.wss-btn-primary{background:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-bg-base,#fff)}',
      '.wss-msg{font-size:12px}',
      '.wss-msg-ok{color:var(--dsw-alias-state-success-primary,#2f9e44)}',
      '.wss-msg-err{color:var(--dsw-alias-state-error-primary,#e03131)}',
      '.wss-advanced{display:flex;flex-direction:column;gap:10px;padding:10px 12px;border:0.5px dashed var(--dsw-alias-border-l2);border-radius:10px}',
      '.wss-note{color:var(--dsw-alias-label-tertiary);font-size:12px;line-height:1.6;margin:0}',
      '.wss-pending{color:var(--dsw-alias-state-warning-primary,#e8590c);margin:0}',
    ].join('')

    const CSS_TAG = 'dsh-web-search-switch/panel.css'
    if (typeof document !== 'undefined' && document.querySelector(`style[data-plugin-css=${JSON.stringify(CSS_TAG)}]`) === null) {
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-web-search-switch'
      tag.dataset.pluginCss = CSS_TAG
      tag.textContent = CSS
      document.head.appendChild(tag)
    }

    /**
     * Resolve the credential reference one catalog entry currently names.
     * @param {(typeof CATALOG)[number]} entry - catalog row.
     * @param {any} snapshot - this plugin's settings snapshot.
     * @returns {string} the reference the host will resolve.
     */
    function refOf(entry, snapshot) {
      if (entry.ref === undefined) return ''
      if (entry.keyField === undefined) return entry.ref
      const declared = snapshot?.value?.[entry.keyField] ?? snapshot?.base?.[entry.keyField]
      return typeof declared === 'string' && declared.length > 0 ? declared : entry.ref
    }

    /** Subscribe a component to one shared configuration form. */
    function useForm(form) {
      const subscribe = React.useCallback((listener) => form.subscribe(listener), [form])
      const get = React.useCallback(() => form.getSnapshot(), [form])
      return React.useSyncExternalStore(subscribe, get, get)
    }

    /** Render the switch panel. Props arrive from the slot plus this plugin's face. */
    function SwitchPanel(props) {
      const { forms, credentials, t } = props
      const webSnap = useForm(forms.web)
      const mineSnap = useForm(forms.mine)

      const currentProvider = currentOf(webSnap)
      const metaOf = (id) => byId(id) ?? { id, labelKey: null, hintKey: null, official: false, unknown: true }
      const labelOf = (meta) => (meta.labelKey === null ? `${t('unknownProvider')}: ${meta.id}` : t(meta.labelKey))
      const currentMeta = metaOf(currentProvider)
      const [draftProvider, setDraftProvider] = React.useState(null)
      const [draftKey, setDraftKey] = React.useState('')
      const [draftMax, setDraftMax] = React.useState(null)
      const [draftTimeout, setDraftTimeout] = React.useState(null)
      const [draftBase, setDraftBase] = React.useState(null)
      const [cred, setCred] = React.useState({})
      const [busy, setBusy] = React.useState(false)
      const [msg, setMsg] = React.useState(null)

      const selected = draftProvider ?? currentProvider
      const selectedMeta = metaOf(selected)
      const selectedLabel = labelOf(selectedMeta)

      const liveMax = mineSnap?.value?.maxResults ?? mineSnap?.base?.maxResults ?? 5
      const liveTimeout = mineSnap?.value?.timeoutMs ?? mineSnap?.base?.timeoutMs ?? 20000
      const liveBase = selectedMeta.baseField === undefined
        ? ''
        : mineSnap?.value?.[selectedMeta.baseField] ?? mineSnap?.base?.[selectedMeta.baseField] ?? ''

      const maxText = draftMax ?? String(liveMax)
      const timeoutText = draftTimeout ?? String(liveTimeout)
      const baseText = draftBase ?? liveBase
      const ref = refOf(selectedMeta, mineSnap)
      const configured = cred[ref]?.configured === true
      const credWritable = cred[ref]?.writable !== false
      const writable = writableOf(webSnap) && writableOf(mineSnap)
      const ready = webSnap?.status === 'ready' && mineSnap?.status === 'ready'

      const refsKey = JSON.stringify(CATALOG.map((entry) => refOf(entry, mineSnap)))
      const refreshCredentials = React.useCallback(async () => {
        if (credentials === undefined) return
        const refs = CATALOG.map((entry) => refOf(entry, mineSnap)).filter((value) => value.length > 0)
        if (refs.length === 0) return
        try {
          const response = await credentials.describe(refs)
          if (response !== undefined && response.ok === false) return
          setCred(response?.value ?? {})
        } catch {
          // A failed describe leaves the previous badges in place.
        }
      }, [credentials, refsKey])

      React.useEffect(() => {
        void refreshCredentials()
      }, [refreshCredentials])

      React.useEffect(() => {
        if (credentials?.$on === undefined) return undefined
        return credentials.$on('credentials/reference-updated', () => {
          void refreshCredentials()
        })
      }, [credentials, refreshCredentials])

      const choose = (id) => {
        setDraftProvider(id)
        setDraftKey('')
        setDraftBase(null)
        setMsg(null)
      }

      const providerChanged = selected !== currentProvider
      const keyChanged = draftKey.trim().length > 0
      const maxChanged = draftMax !== null && draftMax.trim() !== String(liveMax)
      const timeoutChanged = draftTimeout !== null && draftTimeout.trim() !== String(liveTimeout)
      const baseChanged = draftBase !== null && draftBase.trim() !== String(liveBase)
      const dirty = providerChanged || keyChanged || maxChanged || timeoutChanged || baseChanged

      const save = async () => {
        if (busy || !dirty) return
        setBusy(true)
        setMsg(null)
        try {
          if (maxChanged && draftMax.trim() !== '') {
            const value = Number(draftMax)
            if (!Number.isInteger(value) || value < 1 || value > 20) throw new Error(t('invalidNumber'))
          }
          if (timeoutChanged && draftTimeout.trim() !== '') {
            const value = Number(draftTimeout)
            if (!Number.isInteger(value) || value < 5000 || value > 120000) throw new Error(t('invalidNumber'))
          }
          if (baseChanged) {
            const text = draftBase.trim()
            if (text.length > 0 && !/^https?:\/\//u.test(text)) throw new Error(t('invalidBase'))
          }

          if (keyChanged) {
            if (!credWritable) throw new Error(t('keyReadOnly'))
            if (ref.length === 0) throw new Error(t('saveFailed'))
            const response = await credentials.set(ref, draftKey.trim())
            if (response !== undefined && response.ok === false) {
              const detail = response.error?.message ?? response.error ?? ''
              throw new Error(`${t('saveFailed')}${detail ? `: ${String(detail)}` : ''}`)
            }
            setDraftKey('')
            await refreshCredentials()
          }

          if (maxChanged) await writeOrDefault(forms.mine, mineSnap, 'maxResults', draftMax.trim() === '' ? undefined : Number(draftMax), t)
          if (timeoutChanged) await writeOrDefault(forms.mine, mineSnap, 'timeoutMs', draftTimeout.trim() === '' ? undefined : Number(draftTimeout), t)
          if (baseChanged) await writeOrDefault(forms.mine, mineSnap, selectedMeta.baseField, draftBase.trim() === '' ? undefined : draftBase.trim(), t)

          if (providerChanged) {
            const accepted = await forms.web.set('searchProvider', selected)
            if (accepted === false) throw new Error(t('saveFailed'))
          }

          setDraftProvider(null)
          setDraftMax(null)
          setDraftTimeout(null)
          setDraftBase(null)
          setMsg({ ok: true, text: t('saved') })
        } catch (error) {
          setMsg({ ok: false, text: error instanceof Error ? error.message : `${t('saveFailed')}: ${String(error)}` })
        } finally {
          setBusy(false)
        }
      }

      const discard = () => {
        setDraftProvider(null)
        setDraftKey('')
        setDraftMax(null)
        setDraftTimeout(null)
        setDraftBase(null)
        setMsg(null)
      }

      const badge = (entry) => {
        if (entry.official) return h('span', { className: 'wss-chip' }, t('builtin'))
        const entryRef = refOf(entry, mineSnap)
        const state = cred[entryRef]
        if (state?.configured === true) return h('span', { className: 'wss-chip wss-chip-ok' }, t('configured'))
        if (entry.optionalKey) return h('span', { className: 'wss-chip' }, t('optionalKey'))
        return h('span', { className: 'wss-chip wss-chip-warn' }, t('notConfigured'))
      }

      // The badge beside "当前生效" describes the provider in force, not the
      // staged draft: picking a row must not relabel the active configuration.
      const currentRef = refOf(currentMeta, mineSnap)
      const currentConfigured = cred[currentRef]?.configured === true
      const status = ready && !currentMeta.official
        ? h('span', { className: currentConfigured ? 'wss-chip wss-chip-ok' : 'wss-chip wss-chip-warn' },
            currentConfigured ? t('configured') : t('notConfigured'))
        : null

      const embedded = props.view === 'page'
      const children = []
      if (!embedded) children.push(h('h2', { className: 'wss-title', key: 'title' }, t('title')))
      children.push(h('p', { className: 'wss-intro', key: 'intro' }, t('intro')))

      if (!ready) {
        children.push(h('p', { className: 'wss-hint', key: 'status' }, t('loading')))
        if (webSnap?.status === 'unavailable' || mineSnap?.status === 'unavailable') {
          children.push(h('p', { className: 'wss-hint', key: 'unavailable' }, t('unavailable')))
        }
      } else {
        children.push(h('div', { className: 'wss-current', key: 'current' },
          h('span', { className: 'wss-current-label' }, `${t('current')}:`),
          h('strong', null, labelOf(currentMeta)),
          currentMeta.official ? null : h('span', { className: 'wss-chip' }, currentProvider),
          status,
        ))

        if (providerChanged) {
          children.push(h('p', { className: 'wss-hint wss-pending', key: 'pending' },
            t('pendingSwitch', { 0: selectedLabel })))
        }

        children.push(h('div', { className: 'wss-field', key: 'provider' },
          h('span', { className: 'wss-label' }, t('provider')),
          h('ul', { className: 'wss-providers' }, CATALOG.map((entry) => h('li', { key: entry.id },
            h('label', { className: selected === entry.id ? 'wss-provider wss-provider-active' : 'wss-provider' },
              h('input', {
                type: 'radio',
                name: 'wss-provider',
                checked: selected === entry.id,
                onChange: () => choose(entry.id),
                disabled: busy || !writable,
              }),
              h('span', { className: 'wss-provider-main' },
                h('span', { className: 'wss-provider-name' }, t(entry.labelKey)),
                h('span', { className: 'wss-provider-hint' }, t(entry.hintKey)),
              ),
              badge(entry),
            ),
          ))),
        ))

        if (!selectedMeta.official) {
          children.push(h('div', { className: 'wss-field', key: 'key' },
            h('span', { className: 'wss-label' }, `${t('keyLabel')}（${ref}）`),
            h('div', { className: 'wss-field-row' },
              h('input', {
                className: 'wss-input',
                type: 'password',
                autoComplete: 'off',
                placeholder: configured ? t('keySetPlaceholder') : t('keyPlaceholder'),
                value: draftKey,
                disabled: busy || !credWritable,
                onChange: (event) => setDraftKey(event.target.value),
              }),
            ),
            h('p', { className: 'wss-hint' }, configured && !credWritable ? t('keyReadOnly') : t('keyHint')),
            selectedMeta.id === 'search-searxng' ? h('p', { className: 'wss-hint' }, t('optionalKey')) : null,
          ))
        } else {
          children.push(h('p', { className: 'wss-note', key: 'official' },
            selectedMeta.id === 'deepseek-official' ? `${t('officialNote')} ${t('accountNote')}` : t('officialNote'),
          ))
        }

        children.push(h('details', { className: 'wss-advanced', key: 'advanced' },
          h('summary', { className: 'wss-label' }, t('advanced')),
          h('div', { className: 'wss-field' },
            h('span', { className: 'wss-label' }, t('maxResults')),
            h('input', {
              className: 'wss-input wss-input-num',
              type: 'number',
              min: 1,
              max: 20,
              step: 1,
              value: maxText,
              disabled: busy || !writable,
              onChange: (event) => setDraftMax(event.target.value),
            }),
            h('p', { className: 'wss-hint' }, t('maxResultsHint')),
          ),
          h('div', { className: 'wss-field' },
            h('span', { className: 'wss-label' }, t('timeout')),
            h('input', {
              className: 'wss-input wss-input-num',
              type: 'number',
              min: 5000,
              max: 120000,
              step: 1000,
              value: timeoutText,
              disabled: busy || !writable,
              onChange: (event) => setDraftTimeout(event.target.value),
            }),
            h('p', { className: 'wss-hint' }, t('timeoutHint')),
          ),
          selectedMeta.baseField === undefined ? null : h('div', { className: 'wss-field' },
            h('span', { className: 'wss-label' }, `${t('baseLabel')}（${selectedLabel}）`),
            h('input', {
              className: 'wss-input',
              type: 'url',
              placeholder: liveBase || (selected === 'search-searxng' ? 'https://searx.example.com' : ''),
              value: baseText,
              disabled: busy || !writable,
              onChange: (event) => setDraftBase(event.target.value),
            }),
            h('p', { className: 'wss-hint' }, t('baseHint')),
          ),
        ))

        children.push(h('div', { className: 'wss-actions', key: 'actions' },
          h('button', {
            className: 'wss-btn wss-btn-primary',
            type: 'button',
            disabled: busy || !dirty || !writable,
            onClick: () => {
              void save()
            },
          }, busy ? t('saving') : t('save')),
          h('button', {
            className: 'wss-btn',
            type: 'button',
            disabled: busy || !dirty,
            onClick: discard,
          }, t('discard')),
          msg === null ? null : h('span', {
            className: msg.ok ? 'wss-msg wss-msg-ok' : 'wss-msg wss-msg-err',
          }, msg.text),
          h('button', {
            className: 'wss-btn',
            type: 'button',
            disabled: busy,
            onClick: () => {
              void refreshCredentials()
            },
          }, t('refresh')),
        ))

        children.push(h('p', { className: 'wss-note', key: 'note' }, t('reloadNote')))
        if (!writable) children.push(h('p', { className: 'wss-hint', key: 'readonly' }, t('readOnly')))
      }

      return h('div', { className: 'wss-panel' }, children)
    }

    /**
     * Write one settings field, or unset it when the draft is empty.
     * @param {any} form - the shared config form.
     * @param {string} field - field name inside the namespace.
     * @param {unknown} value - parsed value, or undefined to restore inheritance.
     * @param {(key: string) => string} t - the panel's translate function.
     */
    async function writeField(form, field, value, t) {
      const accepted = value === undefined ? await form.unset(field) : await form.set(field, value)
      if (accepted === false) throw new Error(t('saveFailed'))
    }

    /**
     * Write a field, or clear the override when the draft equals the inherited
     * value — so choosing the default again leaves no pointless profile entry.
     * @param {any} form - the shared config form.
     * @param {any} snapshot - the form snapshot carrying the inherited `base`.
     * @param {string} field - field name inside the namespace.
     * @param {unknown} value - parsed draft value, or undefined.
     * @param {(key: string) => string} t - the panel's translate function.
     */
    async function writeOrDefault(form, snapshot, field, value, t) {
      const inherited = snapshot?.base?.[field]
      const same = value !== undefined && inherited !== undefined && String(inherited) === String(value)
      await writeField(form, field, same ? undefined : value, t)
    }

    /** The Plugins page item: a one-liner in the list, the full panel on its page. */
    function PluginsItem(props) {
      if (props.view === 'summary') return h('span', null, props.t('summary'))
      return h(SwitchPanel, props)
    }

    /** Locale-bound translate with a bundled fallback. */
    function translate(ctx) {
      const fallback = (key) => {
        const language = typeof navigator === 'undefined' ? 'en' : navigator.language
        return (String(language).toLowerCase().startsWith('zh') ? zh : en)[key] ?? key
      }
      return (key, params) => {
        const locale = ctx.get('locale')
        if (locale !== undefined) {
          try {
            const resolved = locale.bind(NS)(key, params)
            if (typeof resolved === 'string' && resolved !== key) return resolved
          } catch {
            // Fall through to the bundled dictionary.
          }
        }
        const text = fallback(key)
        if (params === undefined || typeof text !== 'string') return text
        return text.replace(/\{(\w+)\}/gu, (whole, name) => (params[name] === undefined ? whole : String(params[name])))
      }
    }

    const inject = ['slots', 'locale', 'remote', 'remote.credentials', 'configForms']

    /**
     * Mount the settings tab.
     * @param {any} ctx - browser plugin context.
     */
    function apply(ctx) {
      const t = translate(ctx)
      ctx.effect(() => ctx.locale.register(NS, { zh, en }), 'web-search-switch: dictionaries')

      // One shared form per namespace, created lazily so the tab's first render
      // subscribes to the same instances the service owns.
      const forms = {
        web: ctx.configForms.get('web'),
        mine: ctx.configForms.get(ENTRY_ID),
      }
      const credentials = ctx.remote.credentials
      const face = () => ({ forms, credentials, t })

      ctx.slots.inject('settings.plugins.tab', () => ctx.slots.register({
        name: 'settings.plugins.tab',
        id: ENTRY_ID,
        order: 30,
        label: () => t('title'),
        locale: NS,
        inject: face,
      }, (props) => h(SwitchPanel, { ...props, ...face() })))

      // The same panel beside the built-in "网页搜索" card on the Plugins page,
      // which is where users look for search configuration.
      ctx.slots.inject('plugins.item', () => ctx.slots.register({
        name: 'plugins.item',
        id: ENTRY_ID,
        order: 25,
        label: () => t('title'),
        locale: NS,
        inject: face,
      }, (props) => h(PluginsItem, { ...props, ...face() })))
    }

    exports.apply = apply
    exports.inject = inject
    exports.CATALOG = CATALOG
    return module.exports
  },
})
