CODA — Multi-Member-Federation Course Admin — CORE LOGIC PATCHES
File: components/CoachObservationApp.jsx
Apply each patch by finding the exact FIND block and replacing it with the REPLACE block.
Order does not matter, but patch numbers match the explanation given in chat.

================================================================
PATCH 1 — migrateAdminSettings (backward-compat migration)
================================================================
FIND:
    if (role === "course") return { name: a.name || "", pin: a.pin || "", role, memberFederation: a.memberFederation || "", assignedCourseNumbers: a.assignedCourseNumbers || [] };

REPLACE:
    if (role === "course") return { name: a.name || "", pin: a.pin || "", role, memberFederations: a.memberFederations || (a.memberFederation ? [a.memberFederation] : []), assignedCourseNumbers: a.assignedCourseNumbers || [] };


================================================================
PATCH 2 — sessionVisibleMfKeys (course tier branch)
================================================================
FIND:
  if (session.tier === "course") return session.memberFederation ? [session.memberFederation] : [];

REPLACE:
  if (session.tier === "course") return session.memberFederations || [];


================================================================
PATCH 3 — state declaration
================================================================
FIND:
  const [newAdminCourseMf, setNewAdminCourseMf] = useState("");

REPLACE:
  const [newAdminCourseMfSelection, setNewAdminCourseMfSelection] = useState([]);


================================================================
PATCH 4 — handleAddAdmin validation block
================================================================
FIND:
    if (effectiveRole === "course") {
      if (!newAdminCourseMf) {
        setAddAdminError("Select the Member Federation this Course Admin belongs to.");
        return;
      }
      if (iAmLead && !(signedInAdminMatch.memberFederations || []).includes(newAdminCourseMf)) {
        setAddAdminError("You can only add Course Admins for your own Member Federation.");
        return;
      }
      if (newAdminCourseNumbers.length === 0) {
        setAddAdminError("Select at least one course number for this Course Admin.");
        return;
      }
      const existingCourseAdminsInMf = adminSettings.admins.filter(a => a.role === "course" && a.memberFederation === newAdminCourseMf).length;
      if (existingCourseAdminsInMf >= 4) {
        setAddAdminError(`This Member Federation already has 4 Course Admins — the maximum. Remove one before adding another.`);
        return;
      }
    }

REPLACE:
    if (effectiveRole === "course") {
      if (newAdminCourseMfSelection.length === 0) {
        setAddAdminError("Select at least one Member Federation this Course Admin belongs to.");
        return;
      }
      if (iAmLead && newAdminCourseMfSelection.some(mf => !(signedInAdminMatch.memberFederations || []).includes(mf))) {
        setAddAdminError("You can only add Course Admins for your own Member Federation.");
        return;
      }
      if (newAdminCourseNumbers.length === 0) {
        setAddAdminError("Select at least one course number for this Course Admin.");
        return;
      }
      const fullMf = newAdminCourseMfSelection.find(mf =>
        adminSettings.admins.filter(a => a.role === "course" && (a.memberFederations || []).includes(mf)).length >= 4
      );
      if (fullMf) {
        const fullMfLabel = (MEMBER_FEDERATIONS.find(m => m.key === fullMf) || {}).label || fullMf;
        setAddAdminError(`${fullMfLabel} already has 4 Course Admins — the maximum. Remove one before adding another.`);
        return;
      }
    }


================================================================
PATCH 5 — newAdmin object construction
================================================================
FIND:
      : effectiveRole === "course"
      ? { name, pin: pinToUse, role: "course", memberFederation: newAdminCourseMf, assignedCourseNumbers: newAdminCourseNumbers }

REPLACE:
      : effectiveRole === "course"
      ? { name, pin: pinToUse, role: "course", memberFederations: newAdminCourseMfSelection, assignedCourseNumbers: newAdminCourseNumbers }


================================================================
PATCH 6 — reset after successful add
================================================================
FIND:
    setNewAdminCourseMf("");
    setNewAdminCourseNumbers([]);
    setAddAdminError("");

REPLACE:
    setNewAdminCourseMfSelection([]);
    setNewAdminCourseNumbers([]);
    setAddAdminError("");


================================================================
PATCH 7 — resetAdminPanel
================================================================
FIND:
    setNewAdminCourseMf(""); setNewAdminCourseNumbers([]);

REPLACE:
    setNewAdminCourseMfSelection([]); setNewAdminCourseNumbers([]);


================================================================
PATCH 8 — canRemoveAdmin
================================================================
FIND:
    if (iAmLead && target.role === "course" && target.memberFederation && (signedInAdminMatch.memberFederations || []).includes(target.memberFederation)) {
      return { ok: true };
    }

REPLACE:
    if (iAmLead && target.role === "course" && (target.memberFederations || []).some(mf => (signedInAdminMatch.memberFederations || []).includes(mf))) {
      return { ok: true };
    }


================================================================
PATCH 9 — new edit-state, next to editAdminCourseNumbers
================================================================
FIND:
  const [editingAdminCoursesName, setEditingAdminCoursesName] = useState(null);
  const [editAdminCourseNumbers, setEditAdminCourseNumbers] = useState([]);

REPLACE:
  const [editingAdminCoursesName, setEditingAdminCoursesName] = useState(null);
  const [editAdminMfSelection, setEditAdminMfSelection] = useState([]);
  const [editAdminCourseNumbers, setEditAdminCourseNumbers] = useState([]);


================================================================
PATCH 10 — startEditAdminCourses
================================================================
FIND:
  function startEditAdminCourses(name) {
    setEditingAdminCoursesName(name);
    const admin = adminSettings.admins.find(a => a.name === name);
    setEditAdminCourseNumbers((admin && admin.assignedCourseNumbers) || []);
    setEditAdminCoursesError("");
    setEditAdminCoursesSuccessName("");
  }

REPLACE:
  function startEditAdminCourses(name) {
    setEditingAdminCoursesName(name);
    const admin = adminSettings.admins.find(a => a.name === name);
    setEditAdminMfSelection((admin && admin.memberFederations) || []);
    setEditAdminCourseNumbers((admin && admin.assignedCourseNumbers) || []);
    setEditAdminCoursesError("");
    setEditAdminCoursesSuccessName("");
  }


================================================================
PATCH 11 — handleSaveAdminCourses
================================================================
FIND:
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
  }

REPLACE:
  function handleSaveAdminCourses() {
    if (editAdminMfSelection.length === 0) {
      setEditAdminCoursesError("Select at least one Member Federation for this Course Admin.");
      return;
    }
    if (editAdminCourseNumbers.length === 0) {
      setEditAdminCoursesError("Select at least one course number for this Course Admin.");
      return;
    }
    const currentMfs = (adminSettings.admins.find(a => a.name.trim().toLowerCase() === editingAdminCoursesName.trim().toLowerCase())?.memberFederations) || [];
    const newlyAddedMfs = editAdminMfSelection.filter(mf => !currentMfs.includes(mf));
    const fullMf = newlyAddedMfs.find(mf =>
      adminSettings.admins.filter(a => a.role === "course" && (a.memberFederations || []).includes(mf)).length >= 4
    );
    if (fullMf) {
      const fullMfLabel = (MEMBER_FEDERATIONS.find(m => m.key === fullMf) || {}).label || fullMf;
      setEditAdminCoursesError(`${fullMfLabel} already has 4 Course Admins — the maximum.`);
      return;
    }
    const updatedAdmins = adminSettings.admins.map(a =>
      a.name.trim().toLowerCase() === editingAdminCoursesName.trim().toLowerCase() ? { ...a, memberFederations: editAdminMfSelection, assignedCourseNumbers: editAdminCourseNumbers } : a
    );
    saveAdminSettings({ ...adminSettings, admins: updatedAdmins });
    setEditAdminCoursesSuccessName(editingAdminCoursesName);
    setEditingAdminCoursesName(null);
    setEditAdminMfSelection([]);
    setEditAdminCourseNumbers([]);
    setEditAdminCoursesError("");
  }
