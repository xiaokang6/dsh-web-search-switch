# dsh-web-search-switch

> Pick the `web_search` source from a settings page in DeepSeek Harness (desktop and Web): DeepSeek official, Ollama, Tavily, Brave, Exa, Serper, Bocha, Zhipu, SearXNG.

![Plugins page entry](docs/plugins-page.png)

## Why

DSH's built-in `web_search` only runs on DeepSeek official search (`deepseek-official`, needing `DEEPSEEK_API_KEY` or a DeepSeek Account sign-in). The community plugin [`dsh-web-search-ollama`](https://github.com/sryimnoob123/dsh-web-search-ollama) can route it to Ollama, but switching means editing `cordis.patch.yml`, setting a global environment variable, disabling the official provider, and restarting — and only one of the two can be active.

This plugin turns the source into a setting:

- **One page**: Plugins → Built-in plugin settings → Search source, or Settings → Built-in plugins → Search source. Saving applies to the next search; no restart.
- **Official and third-party side by side**: switch back to DeepSeek official at any time without uninstalling anything.
- **Keys never reach the config file**: API keys go through the DSH credentials service (`.credentials.yaml`); the page only reports configured / not configured.
- **No silent fallback**: a selected source without a key fails with an error that names the missing reference and where to set it.

## Supported sources

| Option | Provider id | Default credential | Default endpoint |
| --- | --- | --- | --- |
| DeepSeek official · Messages search | `deepseek-official` | `DEEPSEEK_API_KEY` (or Account sign-in) | built in |
| DeepSeek official · Search API | `deepseek-search-api` | `DEEPSEEK_API_KEY` | built in |
| Ollama Web Search | `search-ollama` | `OLLAMA_API_KEY` | `https://ollama.com/api/web_search` |
| Tavily | `search-tavily` | `TAVILY_API_KEY` | `https://api.tavily.com/search` |
| Brave Search | `search-brave` | `BRAVE_API_KEY` | `https://api.search.brave.com/res/v1/web/search` |
| Exa | `search-exa` | `EXA_API_KEY` | `https://api.exa.ai/search` |
| Serper (Google) | `search-serper` | `SERPER_API_KEY` | `https://google.serper.dev/search` |
| Bocha | `search-bocha` | `BOCHA_API_KEY` | `https://api.bochaai.com/v1/web-search` |
| Zhipu Web Search | `search-zhipu` | `ZHIPU_API_KEY` | `https://open.bigmodel.cn/api/paas/v4/web_search` |
| SearXNG (self-hosted) | `search-searxng` | `SEARXNG_API_KEY` (optional) | your instance + `/search` |

## Supported fetch sources (web_fetch)

The `web_fetch` provider is chosen on the same page; the built-in `http` fetcher and the Ollama fetcher need no config-file edits.

| Option | Provider id | Default credential | Default endpoint |
| --- | --- | --- | --- |
| Built-in HTTP fetch (local) | `http` | none | built in |
| Ollama Web Fetch | `fetch-ollama` | `OLLAMA_API_KEY` | `https://ollama.com/api/web_fetch` |
| DeepSeek official · Fetch API | `deepseek-fetch-api` | DeepSeek search credential ref | built in |

- **Built-in `http`** — fetches one URL locally and converts it to text. No key, no external dependency; a good default.
- **`fetch-ollama`** — calls Ollama's fetch API and returns its extracted content and links, which is cleaner than local HTML-to-text; it shares `OLLAMA_API_KEY` with Ollama search.
- **`deepseek-fetch-api`** — the built-in DeepSeek Fetch API; it needs a valid DeepSeek key, otherwise `web_fetch` fails with 401.

> The built-in "Use the new Web Search API" switch rewrites **both** `searchProvider` and `fetchProvider` as a pair, so it cannot set fetch to `http` or `fetch-ollama` on its own. Use this page's fetch selection for combinations like "Ollama search + local fetch".

## Install

Replace `<profile>` with your profile directory: on desktop usually `%DSH_HOME%\profiles\desktop`, for `dsh web` whichever profile that launch uses.

### From GitHub

```powershell
cd <profile>
pnpm add github:xiaokang6/dsh-web-search-switch
```

Then add `dsh-web-search-switch` to the profile `package.json`:

```json
"dsh": { "profile": { "bundles": ["...existing bundles...", "dsh-web-search-switch"] } }
```

The Plugins page's installer accepts the repository address too and enables the bundle for you.

### From a local checkout (development / link)

1. Add the package to the profile:

   ```powershell
   node scripts/install.mjs --profile <profile>
   ```

   `--dry-run` prints the change without writing. The script writes a `link:` dependency and appends the bundle row, UTF-8 without BOM.

2. Install dependencies:

   ```powershell
   cd <profile>
   pnpm install
   ```

### Restart once

Restart DeepSeek Harness. The Plugins page then shows a **Search source** card under Built-in plugin settings.

The restart is only for the first install; provider switches, keys, and limits apply immediately afterwards.

## Use

1. Plugins → Built-in plugin settings → Search source (or Settings → Built-in plugins → Search source).
2. Pick a source. Third-party sources show an API key field; paste the key.
3. Choose the **fetch provider** below it: built-in HTTP fetch, Ollama Web Fetch, or the DeepSeek Fetch API.
4. Save. The "Active" line updates and the next `web_search` / `web_fetch` uses the new providers.
5. To go back: pick "DeepSeek official · Messages search" and save.

![Search source page](docs/detail.png)

Advanced fields: results per search (1–20, default 5), timeout (5–120 s, default 20 s), and the endpoint override — required for SearXNG, useful for proxies or mirrors elsewhere.

## How it works

- Host half (`lib/index.js`) registers eight search providers and one fetch provider (`fetch-ollama`) on `ctx.web`. Ids use a `search-`/`fetch-` prefix so they never collide with the built-ins (`deepseek-official`, `deepseek-search-api`, `http`, `deepseek-fetch-api`) or with `dsh-web-search-ollama`'s `ollama`.
- The settings page writes the chosen ids into the `web` entry's `searchProvider` / `fetchProvider` — the same mechanism as the official settings page — and config-editor applies it live.
- API keys are resolved per search from the credentials service, so rotation needs no restart.
- Browser half (`lib/client.js`) is a hand-written DSH client bundle registered into `plugins.item` and `settings.plugins.tab`; it requires only the platform `react`.

## Relationship to `dsh-web-search-ollama`

That plugin does run on the desktop: desktop and Web/CLI share one profile format and one `ctx.web` seam. But it registers a single `ollama` provider and switching requires YAML edits, a global `setx` variable, disabling official search, and a restart. This plugin adds the same Ollama access **plus** a settings page that switches among official and other APIs. Do not install both: no id collision occurs (`search-ollama` vs `ollama`), but the page would list two Ollama entries. If you previously applied that plugin's patch (`searchProvider: ollama`, `disabled: true`) or `DSH_WEB_SEARCH_PROVIDER`, remove those overrides after installing this one.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `WEB_PROVIDER_CONFIGURED_MISSING` after saving | The selected provider is not loaded: enable the plugin, check that the profile bundle list contains `dsh-web-search-switch`, restart. |
| "has no API key for XXX_API_KEY" | Fill the key on the Search source page and save, or switch back to official. |
| HTTP 401 / 403 | Invalid or expired key, or no access to that service. |
| SearXNG asks for an instance | Enter the instance root (no `/search`) in Advanced. |
| `web_fetch` fails with `/v1/fetch` 404 (or search with `/v1/search`) | The built-in "Use the new Web Search API" switch is on with its base URL set to `https://ollama.com/v1`. Ollama only serves `POST /api/web_search`; it has no DeepSeek `/v1/search` or `/v1/fetch`. Turn that switch off (fetch returns to the local `http` provider) and search through Search source → Ollama instead. |
| `web_fetch` fails with `HTTP 401 ... api key: sk-**** is invalid` | The fetch provider is still `deepseek-fetch-api` and the credentials store has no usable DeepSeek key. Pick the built-in `http` fetcher (no key) or `fetch-ollama` under Fetch provider and save. |
| No Search source card | The plugin is not loaded; check Installed plugins and the toggle; restart after the first install. |

## License

MIT
