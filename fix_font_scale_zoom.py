path = "components/CoachObservationApp.jsx"
with open(path, "r") as f:
    content = f.read()

broken = '''<div className={`min-h-screen bg-slate-50 ${
        fontScale === "large" ? "coda-font-large" : fontScale === "xlarge" ? "coda-font-xlarge" : ""
      }`}>
        <style>{`
          .coda-font-large { font-size: 112.5%; }
          .coda-font-xlarge { font-size: 125%; }
        `}</style>'''

assert broken in content, "Expected block not found — may already be fixed"

fixed = '''<div
        className="min-h-screen bg-slate-50"
        style={{
          zoom: fontScale === "large" ? 1.15 : fontScale === "xlarge" ? 1.3 : 1,
        }}
      >'''

content = content.replace(broken, fixed, 1)

with open(path, "w") as f:
    f.write(content)

print("Switched font scaling to CSS zoom successfully.")
