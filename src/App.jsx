import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

import AdminDashboard from "./AdminDashboard";
const styles = {
  page: { minHeight: "100vh", background: "#f4f7fb", color: "#172033", fontFamily: "Arial, sans-serif" },
  header: { background: "#102b4e", color: "#fff", padding: "18px 5%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" },
  brand: { fontSize: 22, fontWeight: 800, letterSpacing: "-.4px" },
  subBrand: { fontSize: 12, color: "#c8d8eb", marginTop: 4 },
  nav: { display: "flex", gap: 9, flexWrap: "wrap", alignItems: "center" },
  button: { border: 0, borderRadius: 8, padding: "10px 15px", fontWeight: 700, cursor: "pointer", background: "#1769aa", color: "#fff" },
  lightButton: { border: "1px solid #cbd5e1", borderRadius: 8, padding: "9px 13px", fontWeight: 700, cursor: "pointer", background: "#fff", color: "#18324f" },
  hero: { padding: "42px 5%", background: "linear-gradient(120deg,#173d68,#1769aa)", color: "#fff" },
  heroTitle: { fontSize: "clamp(28px,5vw,42px)", lineHeight: 1.15, margin: "0 0 12px" },
  heroText: { fontSize: 16, color: "#e4effa", maxWidth: 720, lineHeight: 1.6 },
  content: { width: "90%", maxWidth: 1120, margin: "26px auto" },
  panel: { background: "#fff", border: "1px solid #e1e8f0", borderRadius: 12, padding: 18, marginBottom: 18, boxShadow: "0 3px 14px rgba(20,40,70,.04)" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 14 },
  field: { width: "100%", boxSizing: "border-box", padding: "11px 12px", border: "1px solid #cbd5e1", borderRadius: 8, fontSize: 15, marginTop: 6, background: "#fff", color: "#172033" },
  label: { display: "block", fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#334155" },
  jobTitle: { fontSize: 18, fontWeight: 800, margin: "0 0 7px", color: "#173d68" },
  muted: { color: "#64748b", fontSize: 13, lineHeight: 1.5 },
  tag: { display: "inline-block", padding: "5px 9px", borderRadius: 20, background: "#eaf3fb", color: "#17588b", fontSize: 12, margin: "5px 5px 0 0" },
  error: { color: "#b42318", background: "#fff1f0", padding: 10, borderRadius: 8, margin: "10px 0" },
  success: { color: "#17633a", background: "#ecfdf3", padding: 10, borderRadius: 8, margin: "10px 0" },
  footer: { textAlign: "center", padding: 25, color: "#64748b", fontSize: 13 }
};

const emptyJob = {
  title: "", description: "", category: "Engineering",
  opportunity_type: "full_time", experience_level: "Fresher",
  location_city: "", location_state: "", work_mode: "onsite",
  salary_min: "", salary_max: "", salary_period: "LPA",
  skills: "", eligibility: "", application_deadline: ""
};

function displayType(type) {
  return ({
    full_time: "Full-time", part_time: "Part-time", internship: "Internship",
    contract: "Contract", apprenticeship: "Apprenticeship"
  })[type] || type || "Opportunity";
}

function formatJob(row) {
  const employer = Array.isArray(row.employers) ? row.employers[0] : row.employers;
  const place = [row.location_city, row.location_state].filter(Boolean).join(", ");
  let salary = "Not disclosed";
  if (row.salary_min != null && row.salary_max != null) salary = `${row.salary_min}–${row.salary_max} ${row.salary_period || ""}`.trim();
  else if (row.salary_min != null) salary = `${row.salary_min} ${row.salary_period || ""}`.trim();
  return {
    ...row,
    company: employer?.organisation_name || "Verified employer",
    location: place || (row.work_mode === "remote" ? "Remote" : "Location not specified"),
    typeLabel: displayType(row.opportunity_type),
    salaryLabel: salary
  };
}

export default function App() {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [employer, setEmployer] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [authMode, setAuthMode] = useState("login");
  const [showAuth, setShowAuth] = useState(false);
  const [accountType, setAccountType] = useState("candidate");
  const [authForm, setAuthForm] = useState({ full_name: "", email: "", password: "", organisation_name: "", website: "", industry: "" });
  const [search, setSearch] = useState("");
  const [placeSearch, setPlaceSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverNote, setCoverNote] = useState("");
  const [showPost, setShowPost] = useState(false);
  const [jobForm, setJobForm] = useState(emptyJob);

  async function loadJobs() {
    const { data, error: loadError } = await supabase
      .from("jobs")
      .select("*, employers(organisation_name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });
    if (loadError) throw loadError;
    setJobs((data || []).map(formatJob));
  }

  async function loadAccount(currentSession) {
    if (!currentSession?.user) {
      setProfile(null);
      setEmployer(null);
      return;
    }
    const { data: profileData, error: profileError } = await supabase
      .from("profiles").select("*").eq("id", currentSession.user.id).maybeSingle();
    if (profileError) throw profileError;
    setProfile(profileData || null);

    if (profileData?.role === "employer") {
      const { data: employerData, error: employerError } = await supabase
        .from("employers").select("*").eq("owner_id", currentSession.user.id).limit(1).maybeSingle();
      if (employerError) throw employerError;
      setEmployer(employerData || null);
    } else {
      setEmployer(null);
    }
  }

  useEffect(() => {
    let alive = true;
    async function start() {
      try {
        const { data } = await supabase.auth.getSession();
        if (!alive) return;
        setSession(data.session);
        await loadAccount(data.session);
        await loadJobs();
      } catch (e) {
        if (alive) setError(e.message || "Unable to load the portal.");
      } finally {
        if (alive) setLoading(false);
      }
    }
    start();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      Promise.resolve().then(() => loadAccount(nextSession)).catch(e => setError(e.message || "Unable to load account."));
    });
    return () => {
      alive = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const filteredJobs = useMemo(() => {
    const term = search.trim().toLowerCase();
    const place = placeSearch.trim().toLowerCase();
    return jobs.filter(job => {
      const text = [job.title, job.company, job.category, job.description, ...(job.skills || [])].join(" ").toLowerCase();
      const location = `${job.location} ${job.work_mode || ""}`.toLowerCase();
      const matchesTerm = !term || text.includes(term);
      const matchesPlace = !place || location.includes(place);
      const matchesType = typeFilter === "all" || job.opportunity_type === typeFilter;
      return matchesTerm && matchesPlace && matchesType;
    });
  }, [jobs, search, placeSearch, typeFilter]);

  function updateAuth(field, value) {
    setAuthForm(old => ({ ...old, [field]: value }));
  }

  async function submitAuth(event) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    try {
      if (authMode === "register") {
        const metadata = {
          full_name: authForm.full_name.trim(),
          account_type: accountType,
          organisation_name: authForm.organisation_name.trim(),
          website: authForm.website.trim(),
          industry: authForm.industry.trim()
        };
        const { data, error: signError } = await supabase.auth.signUp({
          email: authForm.email.trim(),
          password: authForm.password,
          options: { data: metadata }
        });
        if (signError) throw signError;
        if (data.session) {
          setSession(data.session);
          await loadAccount(data.session);
          if (accountType === "employer") await createEmployerIfNeeded(data.session.user, metadata);
        }
        setMessage("Registration submitted. If email confirmation is enabled, please verify your email and then sign in.");
        setShowAuth(false);
      } else {
        const { data, error: signError } = await supabase.auth.signInWithPassword({
          email: authForm.email.trim(), password: authForm.password
        });
        if (signError) throw signError;
        setSession(data.session);
        await loadAccount(data.session);
        if (data.session?.user && data.session.user.user_metadata?.account_type === "employer") {
          await createEmployerIfNeeded(data.session.user, data.session.user.user_metadata);
        }
        setShowAuth(false);
        setMessage("You are signed in.");
      }
    } catch (e) {
      setError(e.message || "Unable to complete sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function createEmployerIfNeeded(user, metadata = {}) {
    const { data: existing, error: findError } = await supabase
      .from("employers").select("*").eq("owner_id", user.id).limit(1).maybeSingle();
    if (findError) throw findError;
    if (existing) { setEmployer(existing); return existing; }
    const organisationName = metadata.organisation_name || user.user_metadata?.organisation_name || "Organisation";
    const { data, error: insertError } = await supabase.from("employers").insert({
      owner_id: user.id,
      organisation_name: organisationName,
      website: metadata.website || user.user_metadata?.website || null,
      industry: metadata.industry || user.user_metadata?.industry || null
    }).select("*").single();
    if (insertError) throw insertError;
    setEmployer(data);
    return data;
  }

  async function signOut() {
    setError(""); setMessage("");
    const { error: signError } = await supabase.auth.signOut();
    if (signError) setError(signError.message);
    else { setSession(null); setProfile(null); setEmployer(null); setMessage("You have signed out."); }
  }

  async function submitApplication() {
    if (!session) { setAuthMode("login"); setShowAuth(true); return; }
    if (profile?.role !== "candidate") {
      setError("Please sign in with a candidate account to apply for jobs.");
      return;
    }
    if (!selectedJob) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const { error: applyError } = await supabase.from("applications").insert({
        job_id: selectedJob.id,
        candidate_id: session.user.id,
        cover_note: coverNote.trim() || null
      });
      if (applyError) throw applyError;
      setMessage("Your application has been submitted successfully.");
      setSelectedJob(null); setCoverNote("");
    } catch (e) {
      setError(e.code === "23505" ? "You have already applied for this job." : (e.message || "Application could not be submitted."));
    } finally {
      setBusy(false);
    }
  }

  async function submitJob(event) {
    event.preventDefault();
    if (!session) { setAuthMode("login"); setShowAuth(true); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      if (profile?.role !== "employer") throw new Error("Please sign in using an employer account.");
      let currentEmployer = employer;
      if (!currentEmployer) currentEmployer = await createEmployerIfNeeded(session.user, session.user.user_metadata || {});
      const payload = {
        employer_id: currentEmployer.id,
        title: jobForm.title.trim(),
        description: jobForm.description.trim(),
        category: jobForm.category,
        opportunity_type: jobForm.opportunity_type,
        experience_level: jobForm.experience_level || null,
        location_city: jobForm.location_city.trim() || null,
        location_state: jobForm.location_state.trim() || null,
        work_mode: jobForm.work_mode,
        salary_min: jobForm.salary_min === "" ? null : Number(jobForm.salary_min),
        salary_max: jobForm.salary_max === "" ? null : Number(jobForm.salary_max),
        salary_period: jobForm.salary_period || null,
        skills: jobForm.skills.split(",").map(s => s.trim()).filter(Boolean),
        eligibility: jobForm.eligibility.trim() || null,
        application_deadline: jobForm.application_deadline || null,
        status: "pending"
      };
      const { error: postError } = await supabase.from("jobs").insert(payload);
      if (postError) throw postError;
      setShowPost(false); setJobForm(emptyJob);
      setMessage("Your job has been submitted for review. It will appear publicly after approval.");
    } catch (e) {
      setError(e.message || "Unable to submit the job.");
    } finally {
      setBusy(false);
    }
  }

  const field = (label, name, value, onChange, type = "text", required = false) => (
    <label style={styles.label}>{label}{required ? " *" : ""}
      <input style={styles.field} type={type} value={value} required={required}
        onChange={e => onChange(e.target.value)} />
    </label>
  );
if (!loading && profile?.role === "admin") {
    return <AdminDashboard onSignOut={() => supabase.auth.signOut()} />;
   

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.brand}>CareerConnect India</div>
          <div style={styles.subBrand}>Opportunities for every career journey</div>
        </div>
        <nav style={styles.nav}>
          {session ? (
            <>
              <span style={{ color: "#dbeafe", fontSize: 13 }}>{profile?.full_name || session.user.email}</span>
              {profile?.role === "employer" && <button style={styles.button} onClick={() => setShowPost(true)}>Post a job</button>}
              <button style={styles.lightButton} onClick={signOut}>Sign out</button>
            </>
          ) : (
            <>
              <button style={styles.lightButton} onClick={() => { setAuthMode("login"); setShowAuth(true); }}>Sign in</button>
              <button style={styles.button} onClick={() => { setAuthMode("register"); setShowAuth(true); }}>Register</button>
            </>
          )}
        </nav>
      </header>

      <section style={styles.hero}>
        <h1 style={styles.heroTitle}>Find the opportunity<br />that moves you forward.</h1>
        <p style={styles.heroText}>Explore jobs, internships, apprenticeships and career opportunities across India.</p>
      </section>

      <main style={styles.content}>
        {error && <div style={styles.error}>{error}<button style={{ ...styles.lightButton, marginLeft: 10 }} onClick={() => setError("")}>Dismiss</button></div>}
        {message && <div style={styles.success}>{message}<button style={{ ...styles.lightButton, marginLeft: 10 }} onClick={() => setMessage("")}>Dismiss</button></div>}

        <section style={styles.panel}>
          <h2 style={{ marginTop: 0 }}>Explore opportunities</h2>
          <div style={styles.grid}>
            <label style={styles.label}>Search jobs or skills
              <input style={styles.field} value={search} onChange={e => setSearch(e.target.value)} placeholder="e.g. Software Engineer, Python" />
            </label>
            <label style={styles.label}>City, state or work mode
              <input style={styles.field} value={placeSearch} onChange={e => setPlaceSearch(e.target.value)} placeholder="e.g. Kerala, Bengaluru, Remote" />
            </label>
            <label style={styles.label}>Opportunity type
              <select style={styles.field} value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
                <option value="all">All types</option>
                <option value="full_time">Full-time</option>
                <option value="part_time">Part-time</option>
                <option value="internship">Internship</option>
                <option value="contract">Contract</option>
                <option value="apprenticeship">Apprenticeship</option>
              </select>
            </label>
          </div>
        </section>

        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
            <h2 style={{ margin: 0 }}>Latest approved jobs</h2>
            <span style={styles.muted}>{filteredJobs.length} opportunities</span>
          </div>
          {loading ? <div style={styles.panel}>Loading opportunities…</div> :
            filteredJobs.length === 0 ? <div style={styles.panel}>No approved jobs match your search yet. Please check again soon.</div> :
            <div style={styles.grid}>
              {filteredJobs.map(job => (
                <article key={job.id} style={styles.panel}>
                  <div style={styles.jobTitle}>{job.title}</div>
                  <div style={{ fontWeight: 700, marginBottom: 7 }}>{job.company}</div>
                  <div style={styles.muted}>{job.location} · {job.typeLabel}</div>
                  <div style={{ margin: "10px 0", fontWeight: 700, color: "#17633a" }}>{job.salaryLabel}</div>
                  <div><span style={styles.tag}>{job.category}</span><span style={styles.tag}>{job.experience_level || "Experience not specified"}</span></div>
                  <p style={styles.muted}>{(job.description || "").slice(0, 150)}{job.description?.length > 150 ? "…" : ""}</p>
                  <button style={styles.button} onClick={() => setSelectedJob(job)}>View details / Apply</button>
                </article>
              ))}
            </div>
          }
        </section>

        {!session && (
          <section style={{ ...styles.panel, marginTop: 22, textAlign: "center" }}>
            <h2>Are you an employer?</h2>
            <p style={styles.muted}>Create an employer account to submit job opportunities for review.</p>
            <button style={styles.button} onClick={() => { setAccountType("employer"); setAuthMode("register"); setShowAuth(true); }}>Register as employer</button>
          </section>
        )}
      </main>

      <footer style={styles.footer}>CareerConnect India · Connecting people with opportunities</footer>

      {showAuth && (
        <div style={overlayStyle} onClick={() => !busy && setShowAuth(false)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>{authMode === "login" ? "Sign in" : "Create an account"}</h2>
              <button style={styles.lightButton} onClick={() => setShowAuth(false)}>Close</button>
            </div>
            {authMode === "register" && (
              <>
                <label style={styles.label}>Account type
                  <select style={styles.field} value={accountType} onChange={e => setAccountType(e.target.value)}>
                    <option value="candidate">Candidate</option>
                    <option value="employer">Employer</option>
                  </select>
                </label>
                {field("Full name", "full_name", authForm.full_name, v => updateAuth("full_name", v), "text", true)}
                {accountType === "employer" && (
                  <>
                    {field("Organisation name", "organisation_name", authForm.organisation_name, v => updateAuth("organisation_name", v), "text", true)}
                    {field("Website (optional)", "website", authForm.website, v => updateAuth("website", v))}
                    {field("Industry (optional)", "industry", authForm.industry, v => updateAuth("industry", v))}
                  </>
                )}
              </>
            )}
            {field("Email address", "email", authForm.email, v => updateAuth("email", v), "email", true)}
            {field("Password", "password", authForm.password, v => updateAuth("password", v), "password", true)}
            <button style={{ ...styles.button, width: "100%", marginTop: 5 }} disabled={busy} onClick={submitAuth}>
              {busy ? "Please wait…" : authMode === "login" ? "Sign in" : "Create account"}
            </button>
            <p style={styles.muted}>
              {authMode === "login" ? "New here? " : "Already registered? "}
              <button style={{ ...styles.lightButton, padding: "5px 9px" }} onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
                {authMode === "login" ? "Create account" : "Sign in"}
              </button>
            </p>
          </div>
        </div>
      )}

      {selectedJob && (
        <div style={overlayStyle} onClick={() => setSelectedJob(null)}>
          <div style={modalStyle} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <h2 style={{ marginTop: 0 }}>{selectedJob.title}</h2>
              <button style={styles.lightButton} onClick={() => setSelectedJob(null)}>Close</button>
            </div>
            <strong>{selectedJob.company}</strong>
            <p style={styles.muted}>{selectedJob.location} · {selectedJob.typeLabel} · {selectedJob.salaryLabel}</p>
            <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selectedJob.description}</p>
            <p><strong>Eligibility:</strong> {selectedJob.eligibility || "Please check the job description."}</p>
            <p><strong>Skills:</strong> {(selectedJob.skills || []).join(", ") || "Not specified"}</p>
            {session && profile?.role === "candidate" ? (
              <>
                <label style={styles.label}>Short note to the employer (optional)
                  <textarea style={{ ...styles.field, minHeight: 90 }} value={coverNote} onChange={e => setCoverNote(e.target.value)} />
                </label>
                <button style={styles.button} disabled={busy} onClick={submitApplication}>{busy ? "Submitting…" : "Submit application"}</button>
              </>
            ) : (
              <button style={styles.button} onClick={() => { setSelectedJob(null); setAuthMode("login"); setShowAuth(true); }}>
                Sign in as a candidate to apply
              </button>
            )}
          </div>
        </div>
      )}

      {showPost && (
        <div style={overlayStyle} onClick={() => !busy && setShowPost(false)}>
          <form style={modalStyle} onSubmit={submitJob} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ marginTop: 0 }}>Post a job</h2>
              <button type="button" style={styles.lightButton} onClick={() => setShowPost(false)}>Close</button>
            </div>
            {field("Job title", "title", jobForm.title, v => setJobForm(o => ({ ...o, title: v })), "text", true)}
            <label style={styles.label}>Description *
              <textarea style={{ ...styles.field, minHeight: 110 }} required value={jobForm.description} onChange={e => setJobForm(o => ({ ...o, description: e.target.value }))} />
            </label>
            <div style={styles.grid}>
              <label style={styles.label}>Category
                <select style={styles.field} value={jobForm.category} onChange={e => setJobForm(o => ({ ...o, category: e.target.value }))}>
                  <option>Engineering</option><option>IT & Software</option><option>Data & Analytics</option><option>Business & Management</option><option>Customer Support</option><option>Other</option>
                </select>
              </label>
              <label style={styles.label}>Opportunity type
                <select style={styles.field} value={jobForm.opportunity_type} onChange={e => setJobForm(o => ({ ...o, opportunity_type: e.target.value }))}>
                  <option value="full_time">Full-time</option><option value="part_time">Part-time</option><option value="internship">Internship</option><option value="contract">Contract</option><option value="apprenticeship">Apprenticeship</option>
                </select>
              </label>
              <label style={styles.label}>Experience level
                <input style={styles.field} value={jobForm.experience_level} onChange={e => setJobForm(o => ({ ...o, experience_level: e.target.value }))} />
              </label>
              <label style={styles.label}>Work mode
                <select style={styles.field} value={jobForm.work_mode} onChange={e => setJobForm(o => ({ ...o, work_mode: e.target.value }))}>
                  <option value="onsite">On-site</option><option value="hybrid">Hybrid</option><option value="remote">Remote</option>
                </select>
              </label>
              <label style={styles.label}>City
                <input style={styles.field} value={jobForm.location_city} onChange={e => setJobForm(o => ({ ...o, location_city: e.target.value }))} />
              </label>
              <label style={styles.label}>State
                <input style={styles.field} value={jobForm.location_state} onChange={e => setJobForm(o => ({ ...o, location_state: e.target.value }))} />
              </label>
              <label style={styles.label}>Minimum salary
                <input style={styles.field} type="number" min="0" value={jobForm.salary_min} onChange={e => setJobForm(o => ({ ...o, salary_min: e.target.value }))} />
              </label>
              <label style={styles.label}>Maximum salary
                <input style={styles.field} type="number" min="0" value={jobForm.salary_max} onChange={e => setJobForm(o => ({ ...o, salary_max: e.target.value }))} />
              </label>
              <label style={styles.label}>Salary period
                <select style={styles.field} value={jobForm.salary_period} onChange={e => setJobForm(o => ({ ...o, salary_period: e.target.value }))}>
                  <option value="LPA">LPA</option><option value="month">Per month</option><option value="year">Per year</option>
                </select>
              </label>
              <label style={styles.label}>Application deadline
                <input style={styles.field} type="date" value={jobForm.application_deadline} onChange={e => setJobForm(o => ({ ...o, application_deadline: e.target.value }))} />
              </label>
            </div>
            <label style={styles.label}>Skills (comma separated)
              <input style={styles.field} value={jobForm.skills} onChange={e => setJobForm(o => ({ ...o, skills: e.target.value }))} placeholder="Python, Communication, Excel" />
            </label>
            <label style={styles.label}>Eligibility (optional)
              <textarea style={{ ...styles.field, minHeight: 70 }} value={jobForm.eligibility} onChange={e => setJobForm(o => ({ ...o, eligibility: e.target.value }))} />
            </label>
            <button style={styles.button} type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit job for review"}</button>
          </form>
        </div>
      )}
    </div>
  );
}

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(10,25,45,.62)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 14, zIndex: 1000, overflowY: "auto"
};
const modalStyle = {
  background: "#fff", color: "#172033", borderRadius: 14, padding: 22,
  width: "100%", maxWidth: 620, maxHeight: "92vh", overflowY: "auto",
  boxSizing: "border-box", boxShadow: "0 12px 45px rgba(0,0,0,.25)"
};
