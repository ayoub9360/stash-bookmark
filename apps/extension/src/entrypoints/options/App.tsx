import { useState, useEffect } from "react";
import { serverUrl, apiToken, userRules } from "../../lib/storage";
import { defaultRules } from "../../lib/extractors/rules";
import type { SiteRule } from "../../lib/extractors/rules/types";
import { api } from "../../lib/api";

type Status = "idle" | "testing" | "success" | "error";
type Tab = "connection" | "rules";

export function App() {
  const [tab, setTab] = useState<Tab>("connection");

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-2xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold">Stash Extension Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Connect to your self-hosted Stash instance and configure extraction rules.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-lg bg-secondary p-1">
          <button
            onClick={() => setTab("connection")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "connection"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Connection
          </button>
          <button
            onClick={() => setTab("rules")}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              tab === "rules"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Extraction Rules
          </button>
        </div>

        {tab === "connection" ? <ConnectionTab /> : <RulesTab />}
      </div>
    </div>
  );
}

/* ───── Connection Tab ───── */

function ConnectionTab() {
  const [url, setUrl] = useState("");
  const [token, setToken] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    (async () => {
      setUrl(await serverUrl.getValue());
      setToken(await apiToken.getValue());
    })();
  }, []);

  const handleSave = async () => {
    await serverUrl.setValue(url.replace(/\/+$/, ""));
    await apiToken.setValue(token);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async () => {
    setStatus("testing");
    setErrorMsg("");
    try {
      await serverUrl.setValue(url.replace(/\/+$/, ""));
      await apiToken.setValue(token);
      const result = await api.verify();
      setStatus(result.ok ? "success" : "error");
      if (!result.ok) setErrorMsg("Unexpected response from server");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Connection failed");
    }
  };

  return (
    <div className="space-y-6 rounded-xl border border-border bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="server-url">
          Server URL
        </label>
        <input
          id="server-url"
          type="url"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-ring focus:ring-2"
          placeholder="https://stash.example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium" htmlFor="api-token">
          API Token
        </label>
        <input
          id="api-token"
          type="password"
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm font-mono outline-none ring-ring focus:ring-2"
          placeholder="stash_..."
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
        <p className="text-xs text-muted-foreground">
          Generate a token from your Stash instance at Settings &rarr; API Token.
        </p>
      </div>

      {status === "success" && (
        <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Connected successfully
        </div>
      )}
      {status === "error" && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {errorMsg || "Connection failed"}
        </div>
      )}

      <div className="flex gap-3">
        <button
          onClick={handleTest}
          disabled={!url || !token || status === "testing"}
          className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {status === "testing" ? "Testing..." : "Test Connection"}
        </button>
        <button
          onClick={handleSave}
          disabled={!url || !token}
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? "Saved!" : "Save"}
        </button>
      </div>
    </div>
  );
}

/* ───── Rules Tab ───── */

const emptyRule: SiteRule = {
  name: "",
  match: [""],
  scope: "",
  exclude: [],
  selectors: { title: "", author: "", content: "", image: "" },
  enabled: true,
};

function RulesTab() {
  const [rules, setRules] = useState<SiteRule[]>([]);
  const [editing, setEditing] = useState<SiteRule | null>(null);
  const [isNew, setIsNew] = useState(false);

  useEffect(() => {
    userRules.getValue().then(setRules);
  }, []);

  const saveRules = async (updated: SiteRule[]) => {
    setRules(updated);
    await userRules.setValue(updated);
  };

  const handleDelete = async (index: number) => {
    const updated = rules.filter((_, i) => i !== index);
    await saveRules(updated);
  };

  const handleSaveRule = async (rule: SiteRule) => {
    let updated: SiteRule[];
    if (isNew) {
      updated = [...rules, rule];
    } else {
      updated = rules.map((r) => (r.name === editing?.name ? rule : r));
    }
    await saveRules(updated);
    setEditing(null);
    setIsNew(false);
  };

  if (editing) {
    return (
      <RuleEditor
        rule={editing}
        onSave={handleSaveRule}
        onCancel={() => { setEditing(null); setIsNew(false); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Custom rules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Custom Rules
          </h2>
          <button
            onClick={() => { setEditing({ ...emptyRule }); setIsNew(true); }}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            + Add Rule
          </button>
        </div>

        {rules.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border py-8 text-center text-sm text-muted-foreground">
            No custom rules yet. Add one to customize extraction for specific sites.
          </p>
        ) : (
          <div className="space-y-2">
            {rules.map((rule, i) => (
              <RuleCard
                key={rule.name + i}
                rule={rule}
                onEdit={() => setEditing(rule)}
                onDelete={() => handleDelete(i)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Built-in rules */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Built-in Rules
        </h2>
        <div className="space-y-2">
          {defaultRules.map((rule) => (
            <RuleCard key={rule.name} rule={rule} readonly />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ───── Rule Card ───── */

function RuleCard({
  rule,
  readonly,
  onEdit,
  onDelete,
}: {
  rule: SiteRule;
  readonly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-border bg-white p-4 shadow-sm">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{rule.name}</p>
          {readonly && (
            <span className="shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
              built-in
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate text-xs text-muted-foreground font-mono">
          {rule.match.join(", ")}
        </p>
      </div>
      {!readonly && (
        <div className="flex shrink-0 gap-1 ml-3">
          <button
            onClick={onEdit}
            className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="rounded-md px-2 py-1 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}

/* ───── Rule Editor ───── */

function RuleEditor({
  rule,
  onSave,
  onCancel,
}: {
  rule: SiteRule;
  onSave: (rule: SiteRule) => void;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<SiteRule>({ ...rule });
  const [matchInput, setMatchInput] = useState(rule.match.join("\n"));
  const [excludeInput, setExcludeInput] = useState((rule.exclude ?? []).join("\n"));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...form,
      match: matchInput.split("\n").map((s) => s.trim()).filter(Boolean),
      exclude: excludeInput.split("\n").map((s) => s.trim()).filter(Boolean),
      enabled: true,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-xl border border-border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">
        {rule.name ? `Edit: ${rule.name}` : "New Extraction Rule"}
      </h2>

      {/* Name */}
      <Field label="Rule Name" hint="e.g. 'Medium — Article only'">
        <input
          required
          className="input"
          placeholder="My Custom Rule"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
      </Field>

      {/* Match patterns */}
      <Field label="URL Patterns" hint="One per line. Use * for wildcard segments. e.g. medium.com/*">
        <textarea
          required
          className="input min-h-[80px] font-mono text-xs"
          placeholder={"example.com/blog/*\nwww.example.com/blog/*"}
          value={matchInput}
          onChange={(e) => setMatchInput(e.target.value)}
        />
      </Field>

      {/* Scope */}
      <Field label="Scope (CSS selector)" hint="Limits extraction to this element. Leave empty for full page.">
        <input
          className="input font-mono text-xs"
          placeholder="article, main, .post-content"
          value={form.scope ?? ""}
          onChange={(e) => setForm({ ...form, scope: e.target.value })}
        />
      </Field>

      {/* Exclude */}
      <Field label="Exclude (CSS selectors)" hint="One per line. These elements will be removed before extraction.">
        <textarea
          className="input min-h-[60px] font-mono text-xs"
          placeholder={"#comments\naside\n.sidebar"}
          value={excludeInput}
          onChange={(e) => setExcludeInput(e.target.value)}
        />
      </Field>

      {/* Selectors */}
      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Targeted Selectors (optional)</legend>
        <p className="text-xs text-muted-foreground">CSS selectors to extract specific fields. Leave empty to auto-detect.</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Title">
            <input
              className="input font-mono text-xs"
              placeholder="h1, .post-title"
              value={form.selectors?.title ?? ""}
              onChange={(e) =>
                setForm({ ...form, selectors: { ...form.selectors, title: e.target.value } })
              }
            />
          </Field>
          <Field label="Author">
            <input
              className="input font-mono text-xs"
              placeholder=".author, [rel=author]"
              value={form.selectors?.author ?? ""}
              onChange={(e) =>
                setForm({ ...form, selectors: { ...form.selectors, author: e.target.value } })
              }
            />
          </Field>
          <Field label="Content">
            <input
              className="input font-mono text-xs"
              placeholder=".post-body, article p"
              value={form.selectors?.content ?? ""}
              onChange={(e) =>
                setForm({ ...form, selectors: { ...form.selectors, content: e.target.value } })
              }
            />
          </Field>
          <Field label="Image">
            <input
              className="input font-mono text-xs"
              placeholder=".hero-image img"
              value={form.selectors?.image ?? ""}
              onChange={(e) =>
                setForm({ ...form, selectors: { ...form.selectors, image: e.target.value } })
              }
            />
          </Field>
        </div>
      </fieldset>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Save Rule
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-border px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
        >
          Cancel
        </button>
      </div>

      <style>{`
        .input {
          width: 100%;
          border-radius: 0.5rem;
          border: 1px solid hsl(240 5.9% 90%);
          background: hsl(0 0% 100%);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          outline: none;
        }
        .input:focus {
          box-shadow: 0 0 0 2px hsl(240 5.9% 10%);
        }
      `}</style>
    </form>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
