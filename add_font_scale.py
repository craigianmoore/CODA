import re

path = "components/CoachObservationApp.jsx"
with open(path, "r") as f:
    content = f.read()

state_anchor = "const [viewMode, setViewMode] = useState(detectViewMode);"
assert state_anchor in content, "viewMode state anchor not found"
new_state = state_anchor + '''
  const [fontScale, setFontScale] = useState(() => {
    if (typeof window === "undefined") return "normal";
    try { return localStorage.getItem("coda_font_scale") || "normal"; } catch { return "normal"; }
  });
  function handleFontScaleChange(scale) {
    setFontScale(scale);
    try { localStorage.setItem("coda_font_scale", scale); } catch {}
  }'''
content = content.replace(state_anchor, new_state, 1)

root_anchor = '<div className="min-h-screen bg-slate-50">'
assert content.count(root_anchor) >= 1, "Root wrapper div not found"
new_root = '''<style>{`
        .coda-font-large { font-size: 112.5%; }
        .coda-font-xlarge { font-size: 125%; }
      `}</style>
      <div className={`min-h-screen bg-slate-50 ${
        fontScale === "large" ? "coda-font-large" : fontScale === "xlarge" ? "coda-font-xlarge" : ""
      }`}>'''
content = content.replace(root_anchor, new_root, 1)

header_call_anchor = "<Header tab={tab} setTab={setTab} viewMode={viewMode} onViewModeChange={handleViewModeChange}"
assert header_call_anchor in content, "Header call anchor not found"
content = content.replace(
    header_call_anchor,
    header_call_anchor + " fontScale={fontScale} onFontScaleChange={handleFontScaleChange}",
    1
)

header_def_anchor = "function Header({ tab, setTab, viewMode, onViewModeChange, onAdminClick, session, onSignOut }) {"
assert header_def_anchor in content, "Header definition anchor not found"
content = content.replace(
    header_def_anchor,
    "function Header({ tab, setTab, viewMode, onViewModeChange, fontScale, onFontScaleChange, onAdminClick, session, onSignOut }) {",
    1
)

picker_anchor = re.compile(
    r'(\{VIEW_MODES\.map\(v => \{.*?\n[ \t]*\}\)\}\n[ \t]*</div>\n[ \t]*\)\}\n)',
    re.DOTALL
)
pmatch = picker_anchor.search(content)
assert pmatch, "View mode picker block not found"

indent = "          "
font_toggle = f'''{indent}{{onFontScaleChange && (
{indent}  <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5 ml-1.5">
{indent}    {{[
{indent}      {{ id: "normal", label: "A" }},
{indent}      {{ id: "large", label: "A+" }},
{indent}      {{ id: "xlarge", label: "A++" }},
{indent}    ].map(s => (
{indent}      <button
{indent}        key={{s.id}}
{indent}        type="button"
{indent}        onClick={{() => onFontScaleChange(s.id)}}
{indent}        title="Text size"
{indent}        className={{`px-2 py-1.5 rounded-md text-xs font-semibold transition-colors ${{
{indent}          fontScale === s.id ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"
{indent}        }}`}}
{indent}      >
{indent}        {{s.label}}
{indent}      </button>
{indent}    ))}}
{indent}  </div>
{indent})}}
'''
content = content[:pmatch.end()] + font_toggle + content[pmatch.end():]

with open(path, "w") as f:
    f.write(content)

print("All five edits applied successfully.")
