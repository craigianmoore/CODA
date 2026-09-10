import re

path = "components/CoachObservationApp.jsx"
with open(path, "r") as f:
    content = f.read()

# 1. New state
state_anchor = "const [editingAdminPinName, setEditingAdminPinName] = useState(null);"
assert state_anchor in content, "State anchor not found"
new_state = state_anchor + '\n  const [editingAdminCoursesName, setEditingAdminCoursesName] = useState(null);\n  const [editAdminCourseNumbers, setEditAdminCourseNumbers] = useState([]);\n  const [editAdminCoursesError, setEditAdminCoursesError] = useState("");\n  const [editAdminCoursesSuccessName, setEditAdminCoursesSuccessName] = useState("");'
content = content.replace(state_anchor, new_state, 1)

# 2. New functions
func_anchor = 'setEditAdminPinValue(""); setEditAdminPinConfirm(""); setEditAdminPinError("");\n  }'
assert func_anchor in content, "Function anchor not found"
new_functions = func_anchor + '''

  function startEditAdminCourses(name) {
    setEditingAdminCoursesName(name);
    const admin = adminSettings.admins.find(a => a.name === name);
    setEditAdminCourseNumbers((admin && admin.assignedCourseNumbers) || []);
    setEditAdminCoursesError("");
    setEditAdminCoursesSuccessName("");
  }

  function handleSaveAdminCourses() {
    if (editAdminCourseNumbers.length === 0) {
      setEditAdminCoursesError("Select at least one course number for this Course Admin.");
      return;
    }
    const updatedAdmins = adminSettings.admins.map(a =>
      a.name.trim().toLowerCase() === editingAdminCoursesName.trim().toLowerCase() ? { ...a, assignedCourseNumbers: editAdminCourseNumbers } : a
    );
    saveAdminSettings({ ...adminSettings, admins: updatedAdmins });
    setEditAdminCoursesSuccessName(editingAdminCoursesName);
    setEditingAdminCoursesName(null);
    setEditAdminCourseNumbers([]);
    setEditAdminCoursesError("");
  }'''
content = content.replace(func_anchor, new_functions, 1)

# 3. "Edit Courses" button next to "Edit PIN"
pattern = re.compile(
    r'([ \t]*)\{iAmMaster && \(\n'
    r'[ \t]*<button onClick=\{\(\) => editingAdminPinName === a\.name \? setEditingAdminPinName\(null\) : startEditAdminPin\(a\.name\)\}\n'
    r'[ \t]*className="text-\[10px\] font-bold text-indigo-600 hover:text-indigo-800 ml-1">\n'
    r'[ \t]*Edit PIN\n'
    r'[ \t]*</button>\n'
    r'[ \t]*\)\}\n'
)
match = pattern.search(content)
assert match, "Edit PIN button block not found"
indent = match.group(1)
new_button = (
    f'{indent}{{a.role === "course" && (iAmMaster || (iAmLead && (signedInAdminMatch.memberFederations || []).includes(a.memberFederation))) && (\n'
    f'{indent}  <button onClick={{() => editingAdminCoursesName === a.name ? setEditingAdminCoursesName(null) : startEditAdminCourses(a.name)}}\n'
    f'{indent}    className="text-[10px] font-bold text-violet-600 hover:text-violet-800 ml-1">\n'
    f'{indent}    Edit Courses\n'
    f'{indent}  </button>\n'
    f'{indent})}}\n'
)
content = content[:match.end()] + new_button + content[match.end():]

# 4. Inline course-edit panel
panel_pattern = re.compile(
    r'([ \t]*)\{editAdminPinError && <p className="text-xs text-red-600">\{editAdminPinError\}</p>\}\n'
    r'([ \t]*)</div>\n'
    r'([ \t]*)\)\}\n'
)
pmatch = panel_pattern.search(content)
assert pmatch, "PIN panel close anchor not found"
indent2 = pmatch.group(3)
new_panel = f'''{indent2}{{editAdminCoursesSuccessName && (
{indent2}  <p className="text-xs text-emerald-600 mb-2">Courses updated for {{editAdminCoursesSuccessName}}.</p>
{indent2})}}
{indent2}{{editingAdminCoursesName && (
{indent2}  <div className="rounded-lg border border-violet-200 bg-violet-50 p-3 mb-3 space-y-2">
{indent2}    <p className="text-xs font-semibold text-violet-800">Assigned courses for {{editingAdminCoursesName}}</p>
{indent2}    {{(() => {{
{indent2}      const admin = adminSettings.admins.find(a => a.name === editingAdminCoursesName);
{indent2}      const mf = admin ? admin.memberFederation : "";
{indent2}      const options = courseNumbersForMf(mf);
{indent2}      return options.length === 0 ? (
{indent2}        <p className="text-xs text-slate-400">No courses tagged to this federation yet in Completed Tasks.</p>
{indent2}      ) : (
{indent2}        <div className="flex gap-1.5 flex-wrap">
{indent2}          {{options.map(num => (
{indent2}            <button key={{num}} type="button" onClick={{() => setEditAdminCourseNumbers(prev => prev.includes(num) ? prev.filter(n => n !== num) : [...prev, num])}}
{indent2}              className={{`text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${{
{indent2}                editAdminCourseNumbers.includes(num) ? "bg-violet-50 text-violet-700 border-violet-200" : "bg-white text-slate-400 border-slate-200"
{indent2}              }}`}}>
{indent2}              #{{num}}
{indent2}            </button>
{indent2}          ))}}
{indent2}        </div>
{indent2}      );
{indent2}    }})()}}
{indent2}    <div className="flex gap-2">
{indent2}      <button onClick={{handleSaveAdminCourses}} className="text-xs font-semibold text-violet-600 hover:text-violet-700">Save Courses</button>
{indent2}      <button onClick={{() => setEditingAdminCoursesName(null)}} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
{indent2}    </div>
{indent2}    {{editAdminCoursesError && <p className="text-xs text-red-600">{{editAdminCoursesError}}</p>}}
{indent2}  </div>
{indent2})}}
'''
content = content[:pmatch.end()] + new_panel + content[pmatch.end():]

with open(path, "w") as f:
    f.write(content)

print("All four edits applied successfully.")
