path = "components/CoachObservationApp.jsx"
with open(path, "r") as f:
    content = f.read()

broken = '''<style>{`
        .coda-font-large { font-size: 112.5%; }
        .coda-font-xlarge { font-size: 125%; }
      `}</style>
      <div className={`min-h-screen bg-slate-50 ${
        fontScale === "large" ? "coda-font-large" : fontScale === "xlarge" ? "coda-font-xlarge" : ""
      }`}>'''

assert broken in content, "Broken block not found — may already be fixed"

fixed = '''<div className={`min-h-screen bg-slate-50 ${
        fontScale === "large" ? "coda-font-large" : fontScale === "xlarge" ? "coda-font-xlarge" : ""
      }`}>
        <style>{`
          .coda-font-large { font-size: 112.5%; }
          .coda-font-xlarge { font-size: 125%; }
        `}</style>'''

content = content.replace(broken, fixed, 1)

with open(path, "w") as f:
    f.write(content)

print("JSX syntax fixed successfully.")
