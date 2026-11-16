  import React, { useEffect, useMemo, useState } from "react";
import {
  Search, MapPin, BriefcaseBusiness, GraduationCap, Building2,
  ArrowUpRight, IndianRupee, Menu, X, ShieldCheck, Users,
  Plus, ChevronDown, Mail, CheckCircle2
} from "lucide-react";
import { supabase } from "./supabaseClient";

const initialJobs = [
  { id: "sample-1", title: "Graduate Engineer Trainee", company: "Asterion Technologies", location: "Bengaluru, Karnataka", type: "Full-time", category: "Engineering", experience: "Fresher", salary: "₹3.5–5 LPA", posted: "Sample listing", description: "An illustrative entry-level opportunity for engineering graduates.", skills: ["Problem solving", "Communication"], isSample: true },
  { id: "sample-2", title: "Junior Software Developer", company: "Northstar Digital", location: "Hyderabad, Telangana", type: "Full-time", category: "IT & Software", experience: "0–2 years", salary: "₹4–7 LPA", posted: "Sample listing", description: "An illustrative software development opportunity.", skills: ["JavaScript", "React", "SQL"], isSample: true },
  { id: "sample-3", title: "Data Analyst Intern", company: "BluePeak Analytics", location: "Remote · India", type: "Internship", category: "Data & Analytics", experience: "Student", salary: "₹12,000/month", posted: "Sample listing", description: "An illustrative data analytics internship.", skills: ["Excel", "Python"], isSample: true },
  { id: "sample-4", title: "Management Trainee", company: "Meridian Consumer Ltd.", location: "Mumbai, Maharashtra", type: "Full-time", category: "Business & Management", experience: "Fresher", salary: "₹4–6 LPA", posted: "Sample listing", description: "An illustrative management trainee opportunity.", skills: ["Communication", "Analysis"], isSample: true },
  { id: "sample-5", title: "Mechanical Design Intern", company: "ForgeWorks Industries", location: "Coimbatore, Tamil Nadu", type: "Internship", category: "Engineering", experience: "Student", salary: "Stipend provided", posted: "Sample listing", description: "An illustrative mechanical design internship.", skills: ["CAD", "Design basics"], isSample: true },
  { id: "sample-6", title: "Customer Success Associate", company: "CloudHarbor Services", location: "Kochi, Kerala", type: "Full-time", category: "Customer Support", experience: "0–2 years", salary: "₹2.8–4 LPA", posted: "Sample listing", description: "An illustrative customer support opportunity.", skills: ["Communication", "Customer service"], isSample: true }
];

const categories = [
  "All opportunities", "Engineering", "IT & Software",
  "Data & Analytics", "Business & Management", "Customer Support"
];

function formatJob(row) {
  const employer = row.employers;
  const location = [row.location_city, row.location_state]
    .filter(Boolean).join(", ") || "Location not specified";

  let salary = "Not disclosed";
  if (row.salary_min != null && row.salary_max != null) {
    salary = `${row.salary_min}–${row.salary_max} ${row.salary_period || ""}`.trim();
  } else if (row.salary_min != null) {
    salary = `${row.salary_min} ${row.salary_period || ""}`.trim();
  }

  const typeNames = {
    full_time: "Full-time",
    part_time: "Part-time",
    internship: "Internship",
    contract: "Contract",
    apprenticeship: "Apprenticeship"
  };

  return {
    id: row.id,
    title: row.title,
    company: employer?.organisation_name || "Employer",
    location,
    type: typeNames[row.opportunity_type] || row.opportunity_type,
    category: row.category,
    experience: row.experience_level || "Not specified",
    salary,
    posted: row.created_at
      ? new Date(row.created_at).toLocaleDateString()
      : "Recently posted",
    description: row.description,
    skills: row.skills || [],
    isSample: false
  };
}

function App() {
  const [jobs, setJobs] = useState(initialJobs);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("All opportunities");
  const [kind, setKind] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [notice, setNotice] = useState("");
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState("signup");
  const [authRole, setAuthRole] = useState("candidate");
  const [authBusy, setAuthBusy] = useState(false);
  const [applicationBusy, setApplicationBusy] = useState(false);
  const [coverNote, setCoverNote] = useState("");

  async function loadAccount(user) {
    if (!user) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (error) {
      setNotice("Could not load your account profile: " + error.message);
      return;
    }

    setProfile(data);

    if (data?.role === "employer") {
      const { data: existingEmployer } = await supabase
        .from("employers")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!existingEmployer) {
        const metadata = user.user_metadata || {};
        const organisationName =
          metadata.organisation_name || metadata.full_name || "New organisation";

        const { error: employerError } = await supabase
          .from("employers")
          .insert({
            owner_id: user.id,
            organisation_name: organisationName,
            website: metadata.website || null,
            industry: metadata.industry || null
          });

        if (employerError) {
          setNotice("Your account is ready, but employer details need attention: " + employerError.message);
        }
      }
    }
  }

  async function loadJobs() {
    const { data, error } = await supabase
      .from("jobs")
      .select("*, employers(organisation_name)")
      .eq("status", "approved")
      .order("created_at", { ascending: false });

    if (error) {
      setNotice("Live job listings could not be loaded. Sample listings are still shown.");
      return;
    }

    const liveJobs = (data || []).map(formatJob);
    setJobs([...liveJobs, ...initialJobs]);
  }

  useEffect(() => {
    let active = true;

    async function initialise() {
      const { data } = await supabase.auth.getSession();

      if (!active) return;

      setSession(data.session);
      if (data.session?.user) {
        await loadAccount(data.session.user);
      }

      await loadJobs();
      if (active) setLoading(false);
    }

    initialise();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        if (newSession?.user) {
          Promise.resolve().then(() => loadAccount(newSession.user));
        } else {
          setProfile(null);
        }
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  const filtered = useMemo(() => jobs.filter(job => {
    const q = query.toLowerCase();
    const matchQ = !q || [
      job.title, job.company, job.category, ...(job.skills || [])
    ].join(" ").toLowerCase().includes(q);

    const matchLoc = !location ||
      job.location.toLowerCase().includes(location.toLowerCase());

    const matchCat = category === "All opportunities" ||
      job.category === category;

    const matchKind = kind === "All" || job.type === kind;

    return matchQ && matchLoc && matchCat && matchKind;
  }), [jobs, query, location, category, kind]);

  function openEmployerPosting() {
    setShowMobile(false);

    if (!session) {
      setAuthRole("employer");
      setAuthMode("signup");
      setShowAuth(true);
      return;
    }

    if (profile?.role !== "employer") {
      setNotice("Please use an employer account to submit vacancies.");
      return;
    }

    setShowPost(true);
  }

  function openApplication(job) {
    if (job.isSample) {
      setNotice("This is an illustrative sample listing. Applications are not available for sample vacancies.");
      return;
    }

    if (!session) {
      setAuthRole("candidate");
      setAuthMode("login");
      setShowAuth(true);
      setNotice("Please log in as a candidate before applying.");
      return;
    }

    if (profile?.role !== "candidate") {
      setNotice("Only candidate accounts can apply for jobs.");
      return;
    }

    setCoverNote("");
  }

  async function submitApplication() {
    if (!selected || selected.isSample) return;

    if (!session || profile?.role !== "candidate") {
      setNotice("Please log in with a candidate account to apply.");
      return;
    }

    setApplicationBusy(true);

    const { error } = await supabase
      .from("applications")
      .insert({
        job_id: selected.id,
        candidate_id: session.user.id,
        cover_note: coverNote.trim() || null
      });

    setApplicationBusy(false);

    if (error) {
      if (error.code === "23505") {
        setNotice("You have already applied for this job.");
      } else {
        setNotice("Application could not be submitted: " + error.message);
      }
      return;
    }

    setNotice("Your application has been submitted successfully.");
    setSelected(null);
    setCoverNote("");
  }

  async function handleAuth(event) {
    event.preventDefault();
    setAuthBusy(true);
    setNotice("");

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") || "").trim();
    const password = String(form.get("password") || "");

    let result;

    if (authMode === "signup") {
      const fullName = String(form.get("full_name") || "").trim();
      const organisationName = String(form.get("organisation_name") || "").trim();
      const website = String(form.get("website") || "").trim();
      const industry = String(form.get("industry") || "").trim();

      result = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            account_type: authRole,
            organisation_name: authRole === "employer" ? organisationName : "",
            website,
            industry
          }
        }
      });
    } else {
      result = await supabase.auth.signInWithPassword({ email, password });
    }

    setAuthBusy(false);

    if (result.error) {
      setNotice(result.error.message);
      return;
    }

    if (authMode === "signup" && !result.data.session) {
      setShowAuth(false);
      setNotice("Registration received. Please check your email for the confirmation link, then log in.");
      return;
    }

    setSession(result.data.session);
    if (result.data.user) {
      await loadAccount(result.data.user);
    }

    setShowAuth(false);
    setNotice(authMode === "signup"
      ? "Your account has been created successfully."
      : "You are now logged in.");
  }

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setNotice("Could not log out: " + error.message);
      return;
    }
    setSession(null);
    setProfile(null);
    setNotice("You have been logged out.");
  }

  async function postJob(event) {
    event.preventDefault();

    if (!session || profile?.role !== "employer") {
      setNotice("Please log in with an employer account first.");
      setShowPost(false);
      return;
    }

    const form = new FormData(event.currentTarget);
    const locationText = String(form.get("location") || "").trim();
    const locationParts = locationText.split(",");
    const city = locationParts[0]?.trim() || locationText;
    const state = locationParts.slice(1).join(",").trim();
    const type = String(form.get("type"));
    const salaryText = String(form.get("salary") || "").trim();
    const salaryNumbers = salaryText.match(/\d+(?:\.\d+)?/g) || [];
    const salaryPeriod = /lpa/i.test(salaryText)
      ? "LPA"
      : /month/i.test(salaryText)
        ? "per month"
        : null;

    const { data: employer, error: employerError } = await supabase
      .from("employers")
      .select("id")
      .eq("owner_id", session.user.id)
      .maybeSingle();

    if (employerError || !employer) {
      setNotice("Your employer profile is not ready. Please log out and log in again.");
      return;
    }

    const jobData = {
      employer_id: employer.id,
      title: String(form.get("title")).trim(),
      description: String(form.get("description")).trim(),
      category: String(form.get("category")),
      opportunity_type: type === "Full-time" ? "full_time" : "internship",
      experience_level: String(form.get("experience") || "").trim() || null,
      location_city: city,
      location_state: state || null,
      work_mode: /remote/i.test(locationText) ? "remote" : "onsite",
      salary_min: salaryNumbers[0] ? Number(salaryNumbers[0]) : null,
      salary_max: salaryNumbers[1] ? Number(salaryNumbers[1]) : null,
      salary_period: salaryPeriod,
      skills: String(form.get("skills") || "")
        .split(",").map(s => s.trim()).filter(Boolean),
      application_url: String(form.get("apply") || "").trim() || null,
      status: "pending"
    };

    const { error } = await supabase.from("jobs").insert(jobData);

    if (error) {
      setNotice("Vacancy could not be submitted: " + error.message);
      return;
    }

    setShowPost(false);
    setNotice("Your vacancy has been submitted for verification. It will appear publicly after approval.");
  }

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#" aria-label="CareerConnect India home">
        <span className="brand-mark"><BriefcaseBusiness size={21}/></span>
        <span><b>CareerConnect</b><small>INDIA</small></span>
      </a>

      <nav className={showMobile ? "nav open" : "nav"}>
        <a href="#jobs" onClick={() => setShowMobile(false)}>Find Jobs</a>
        <a href="#internships" onClick={() => {
          setKind("Internship");
          setShowMobile(false);
        }}>Internships</a>
        <a href="#how" onClick={() => setShowMobile(false)}>How it works</a>
        <button className="nav-post" onClick={openEmployerPosting}>
          <Plus size={16}/> Post a vacancy
        </button>
        {session ? (
          <button className="nav-post" onClick={handleLogout}>Log out</button>
        ) : (
          <button className="nav-post" onClick={() => {
            setAuthMode("login");
            setAuthRole("candidate");
            setShowAuth(true);
            setShowMobile(false);
          }}>Log in</button>
        )}
      </nav>

      <button className="menu-btn" aria-label="Toggle menu" onClick={() => setShowMobile(!showMobile)}>
        {showMobile ? <X/> : <Menu/>}
      </button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-inner">
          <div className="eyebrow"><span className="pulse"></span> OPPORTUNITIES FOR EVERYONE, EVERYWHERE</div>
          <h1>Find work that moves<br/><em>your future forward.</em></h1>
          <p className="hero-copy">Discover jobs, internships and career opportunities from across India. One platform. Equal access. No fees for job seekers.</p>

          <div className="search-panel">
            <label className="search-field">
              <Search size={19}/>
              <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company"/>
            </label>
            <span className="search-divider"></span>
            <label className="search-field">
              <MapPin size={19}/>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, state or remote"/>
            </label>
            <button className="search-btn" onClick={() => document.getElementById("jobs").scrollIntoView({behavior:"smooth"})}>
              Search jobs <ArrowUpRight size={17}/>
            </button>
          </div>

          <div className="popular">
            <span>Popular:</span>
            {["Software", "Fresher", "Internship", "Data Analyst"].map(t =>
              <button key={t} onClick={() => {
                setQuery(t);
                document.getElementById("jobs").scrollIntoView({behavior:"smooth"});
              }}>{t}</button>
            )}
          </div>
        </div>
        <div className="hero-note"><ShieldCheck size={16}/> Built around accessible, transparent opportunities</div>
      </section>

      {notice && <div className="notice">
        <CheckCircle2 size={18}/>{notice}
        <button onClick={() => setNotice("")}><X size={16}/></button>
      </div>}

      <section className="stats wrap">
        <div><strong>Pan-India</strong><span>Opportunities across locations</span></div>
        <div><strong>All disciplines</strong><span>Every education and career path</span></div>
        <div><strong>₹0</strong><span>Free access for job seekers</span></div>
        <div><strong>Open access</strong><span>For students and professionals</span></div>
      </section>

      <section className="section wrap" id="jobs">
        <div className="section-heading">
          <div>
            <div className="kicker">EXPLORE OPPORTUNITIES</div>
            <h2>Find your next opportunity</h2>
            <p>Search openings that match your interests, skills and ambitions.</p>
          </div>
          <button className="text-link" onClick={() => {
            setQuery("");
            setLocation("");
            setCategory("All opportunities");
            setKind("All");
          }}>Clear filters <ArrowUpRight size={16}/></button>
        </div>

        <div className="filters">
          <div className="category-tabs">
            {categories.map(c =>
              <button key={c} className={category === c ? "active" : ""} onClick={() => setCategory(c)}>{c}</button>
            )}
          </div>
          <div className="filter-row">
            <label className="select-wrap">
              <span>Opportunity type</span>
              <select value={kind} onChange={e => setKind(e.target.value)}>
                <option>All</option>
                <option>Full-time</option>
                <option>Internship</option>
              </select>
              <ChevronDown size={15}/>
            </label>
            <span className="results-count">
              {loading ? "Loading opportunities…" : `${filtered.length} opportunities shown`}
            </span>
          </div>
        </div>

        <div className="job-grid">
          {filtered.map(job =>
            <article className="job-card" key={job.id}>
              <div className="job-top">
                <div className="company-icon">{job.company.slice(0,1).toUpperCase()}</div>
                <span className="posted">{job.posted}</span>
              </div>
              <div className="job-category">{job.category}</div>
              <h3>{job.title}</h3>
              <p className="company-name">{job.company}</p>
              <div className="job-meta">
                <span><MapPin size={14}/>{job.location}</span>
                <span><BriefcaseBusiness size={14}/>{job.type}</span>
              </div>
              <div className="job-bottom">
                <div><b>{job.salary}</b><small>{job.experience}</small></div>
                <button onClick={() => {
                  setSelected(job);
                  setCoverNote("");
                }} aria-label={`View ${job.title}`}>
                  <ArrowUpRight size={19}/>
                </button>
              </div>
            </article>
          )}

          {filtered.length === 0 && <div className="empty">
            <Search size={28}/>
 </div>
          )}
        </div>
      </div>
    </div>
  );
} 
