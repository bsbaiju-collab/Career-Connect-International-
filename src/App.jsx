import React, { useMemo, useState } from "react";
import { Search, MapPin, BriefcaseBusiness, GraduationCap, Building2, ArrowUpRight, Clock3, IndianRupee, Menu, X, ShieldCheck, Users, TrendingUp, Plus, ChevronDown, Bookmark, Mail, CheckCircle2 } from "lucide-react";

const initialJobs = [
  { id: 1, title: "Graduate Engineer Trainee", company: "Asterion Technologies", location: "Bengaluru, Karnataka", type: "Full-time", category: "Engineering", experience: "Fresher", salary: "₹3.5–5 LPA", posted: "2 days ago", description: "An entry-level opportunity for engineering graduates to work with multidisciplinary project teams. Candidates from eligible engineering branches may apply.", skills: ["Problem solving", "Communication", "Engineering fundamentals"], apply: "https://example.com/apply" },
  { id: 2, title: "Junior Software Developer", company: "Northstar Digital", location: "Hyderabad, Telangana", type: "Full-time", category: "IT & Software", experience: "0–2 years", salary: "₹4–7 LPA", posted: "1 day ago", description: "Join a product engineering team building reliable web applications. Applicants should have programming fundamentals and an interest in modern software development.", skills: ["JavaScript", "React", "SQL"], apply: "https://example.com/apply" },
  { id: 3, title: "Data Analyst Intern", company: "BluePeak Analytics", location: "Remote · India", type: "Internship", category: "Data & Analytics", experience: "Student", salary: "₹12,000/month", posted: "3 days ago", description: "A learning-focused internship supporting data cleaning, dashboard preparation and business reporting. Mentorship and project exposure are included.", skills: ["Excel", "Python", "Data visualisation"], apply: "https://example.com/apply" },
  { id: 4, title: "Management Trainee", company: "Meridian Consumer Ltd.", location: "Mumbai, Maharashtra", type: "Full-time", category: "Business & Management", experience: "Fresher", salary: "₹4–6 LPA", posted: "4 days ago", description: "A structured early-career role with rotations across operations, sales and business support functions.", skills: ["Communication", "Analysis", "Teamwork"], apply: "https://example.com/apply" },
  { id: 5, title: "Mechanical Design Intern", company: "ForgeWorks Industries", location: "Coimbatore, Tamil Nadu", type: "Internship", category: "Engineering", experience: "Student", salary: "Stipend provided", posted: "5 days ago", description: "Work alongside design engineers on component modelling, drawings and documentation. Suitable for students seeking practical exposure.", skills: ["CAD", "Design basics", "Documentation"], apply: "https://example.com/apply" },
  { id: 6, title: "Customer Success Associate", company: "CloudHarbor Services", location: "Kochi, Kerala", type: "Full-time", category: "Customer Support", experience: "0–2 years", salary: "₹2.8–4 LPA", posted: "6 days ago", description: "Support customers through onboarding and product guidance. Strong written and verbal communication skills are important.", skills: ["Communication", "Customer service", "Problem solving"], apply: "https://example.com/apply" }
];

const categories = ["All opportunities", "Engineering", "IT & Software", "Data & Analytics", "Business & Management", "Customer Support"];
const readJobs = () => {
  try { return [...JSON.parse(localStorage.getItem("cci-demo-jobs") || "[]"), ...initialJobs]; }
  catch { return initialJobs; }
};

function App() {
  const [jobs, setJobs] = useState(readJobs);
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [category, setCategory] = useState("All opportunities");
  const [kind, setKind] = useState("All");
  const [selected, setSelected] = useState(null);
  const [showPost, setShowPost] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [notice, setNotice] = useState("");

  const filtered = useMemo(() => jobs.filter(j => {
    const q = query.toLowerCase();
    const matchQ = !q || [j.title, j.company, j.category, ...(j.skills || [])].join(" ").toLowerCase().includes(q);
    const matchLoc = !location || j.location.toLowerCase().includes(location.toLowerCase());
    const matchCat = category === "All opportunities" || j.category === category;
    const matchKind = kind === "All" || j.type === kind;
    return matchQ && matchLoc && matchCat && matchKind;
  }), [jobs, query, location, category, kind]);

  function postJob(event) {
    event.preventDefault();
    const f = new FormData(event.currentTarget);
    const newJob = {
      id: Date.now(), title: f.get("title"), company: f.get("company"),
      location: f.get("location"), type: f.get("type"), category: f.get("category"),
      experience: f.get("experience"), salary: f.get("salary") || "Not disclosed",
      posted: "Just submitted", description: f.get("description"),
      skills: String(f.get("skills") || "").split(",").map(s => s.trim()).filter(Boolean),
      apply: f.get("apply") || "#"
    };
    const demoJobs = JSON.parse(localStorage.getItem("cci-demo-jobs") || "[]");
    demoJobs.unshift(newJob);
    localStorage.setItem("cci-demo-jobs", JSON.stringify(demoJobs));
    setJobs(readJobs());
    setShowPost(false);
    setNotice("Your sample vacancy has been added to this browser preview. It is not yet published to a shared website.");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return <div className="app">
    <header className="topbar">
      <a className="brand" href="#" aria-label="CareerConnect India home">
        <span className="brand-mark"><BriefcaseBusiness size={21}/></span>
        <span><b>CareerConnect</b><small>INDIA</small></span>
      </a>
      <nav className={showMobile ? "nav open" : "nav"}>
        <a href="#jobs" onClick={() => setShowMobile(false)}>Find Jobs</a>
        <a href="#internships" onClick={() => { setKind("Internship"); setShowMobile(false); }}>Internships</a>
        <a href="#how" onClick={() => setShowMobile(false)}>How it works</a>
        <button className="nav-post" onClick={() => { setShowPost(true); setShowMobile(false); }}><Plus size={16}/> Post a vacancy</button>
      </nav>
      <button className="menu-btn" aria-label="Toggle menu" onClick={() => setShowMobile(!showMobile)}>{showMobile ? <X/> : <Menu/>}</button>
    </header>

    <main>
      <section className="hero">
        <div className="hero-glow"></div>
        <div className="hero-inner">
          <div className="eyebrow"><span className="pulse"></span> OPPORTUNITIES FOR EVERYONE, EVERYWHERE</div>
          <h1>Find work that moves<br/><em>your future forward.</em></h1>
          <p className="hero-copy">Discover jobs, internships and career opportunities from across India. One platform. Equal access. No fees for job seekers.</p>
          <div className="search-panel">
            <label className="search-field"><Search size={19}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Job title, skill or company"/></label>
            <span className="search-divider"></span>
            <label className="search-field"><MapPin size={19}/><input value={location} onChange={e => setLocation(e.target.value)} placeholder="City, state or remote"/></label>
            <button className="search-btn" onClick={() => document.getElementById("jobs").scrollIntoView({behavior:"smooth"})}>Search jobs <ArrowUpRight size={17}/></button>
          </div>
          <div className="popular"><span>Popular:</span>{["Software","Fresher","Internship","Data Analyst"].map(t => <button key={t} onClick={() => {setQuery(t); document.getElementById("jobs").scrollIntoView({behavior:"smooth"});}}>{t}</button>)}</div>
        </div>
        <div className="hero-note"><ShieldCheck size={16}/> Built around accessible, transparent opportunities</div>
      </section>

      {notice && <div className="notice"><CheckCircle2 size={18}/>{notice}<button onClick={() => setNotice("")}><X size={16}/></button></div>}

      <section className="stats wrap">
        <div><strong>Pan-India</strong><span>Opportunities across locations</span></div>
        <div><strong>All disciplines</strong><span>Every education and career path</span></div>
        <div><strong>₹0</strong><span>Free access for job seekers</span></div>
        <div><strong>Open access</strong><span>For students and professionals</span></div>
      </section>

      <section className="section wrap" id="jobs">
        <div className="section-heading">
          <div><div className="kicker">EXPLORE OPPORTUNITIES</div><h2>Find your next opportunity</h2><p>Search openings that match your interests, skills and ambitions.</p></div>
          <button className="text-link" onClick={() => {setQuery("");setLocation("");setCategory("All opportunities");setKind("All");}}>Clear filters <ArrowUpRight size={16}/></button>
        </div>
        <div className="filters">
          <div className="category-tabs">{categories.map(c => <button key={c} className={category===c?"active":""} onClick={() => setCategory(c)}>{c}</button>)}</div>
          <div className="filter-row">
            <label className="select-wrap"><span>Opportunity type</span><select value={kind} onChange={e => setKind(e.target.value)}><option>All</option><option>Full-time</option><option>Internship</option></select><ChevronDown size={15}/></label>
            <span className="results-count">{filtered.length} opportunities shown</span>
          </div>
        </div>
        <div className="job-grid">
          {filtered.map(job => <article className="job-card" key={job.id}>
            <div className="job-top"><div className="company-icon">{job.company.slice(0,1).toUpperCase()}</div><span className="posted">{job.posted}</span></div>
            <div className="job-category">{job.category}</div>
            <h3>{job.title}</h3><p className="company-name">{job.company}</p>
            <div className="job-meta"><span><MapPin size={14}/>{job.location}</span><span><BriefcaseBusiness size={14}/>{job.type}</span></div>
            <div className="job-bottom"><div><b>{job.salary}</b><small>{job.experience}</small></div><button onClick={() => setSelected(job)} aria-label={`View ${job.title}`}><ArrowUpRight size={19}/></button></div>
          </article>)}
          {filtered.length === 0 && <div className="empty"><Search size={28}/><h3>No matching opportunities</h3><p>Try a different keyword, location or category.</p><button className="outline-btn" onClick={() => {setQuery("");setLocation("");setCategory("All opportunities");setKind("All");}}>Reset search</button></div>}
        </div>
        <p className="demo-disclaimer">Preview notice: these are illustrative sample listings, not verified live vacancies. Real listings will appear after the database and verification workflow are connected.</p>
      </section>

      <section className="band" id="how"><div className="wrap band-inner">
        <div><div className="kicker light">A FAIRER WAY TO FIND WORK</div><h2>Opportunity should be<br/>within everyone's reach.</h2><p>CareerConnect India is designed to bring candidates and employers together through a simple, transparent and accessible platform.</p></div>
        <div className="value-list">
          <div><span><Users size={20}/></span><section><b>For every career stage</b><small>Students, fresh graduates and experienced professionals.</small></section></div>
          <div><span><Building2 size={20}/></span><section><b>For employers of every size</b><small>Companies, startups, institutions and recruiters.</small></section></div>
          <div><span><GraduationCap size={20}/></span><section><b>Beyond job listings</b><small>Internships, career resources and skill development.</small></section></div>
        </div>
      </div></section>

      <section className="section wrap split">
        <div><div className="kicker">FOR EMPLOYERS</div><h2>Reach talent across India.</h2><p>Share genuine opportunities with students, graduates and professionals. Employer posting will be free during the initial launch.</p><button className="primary-btn" onClick={() => setShowPost(true)}>Submit a vacancy <ArrowUpRight size={17}/></button></div>
        <div className="employer-card"><div className="employer-icon"><Building2 size={25}/></div><h3>Build your talent pipeline</h3><p>Submit a role, provide clear eligibility details and let candidates apply through your preferred application process.</p><div className="employer-points"><span><CheckCircle2 size={16}/> No posting fee</span><span><CheckCircle2 size={16}/> Clear role information</span><span><CheckCircle2 size={16}/> Nationwide reach</span></div></div>
      </section>

      <section className="newsletter"><div className="wrap newsletter-inner"><div><div className="kicker light">STAY IN THE LOOP</div><h2>Good opportunities don't wait.</h2><p>Registration and job alerts will be available when the secure account system launches.</p></div><div className="newsletter-tag"><Mail size={20}/> Career updates coming soon</div></div></section>
    </main>

    <footer><div className="wrap footer-inner"><a className="brand footer-brand" href="#"><span className="brand-mark"><BriefcaseBusiness size={20}/></span><span><b>CareerConnect</b><small>INDIA</small></span></a><p>Connecting Talent. Creating Opportunities.</p><span>© {new Date().getFullYear()} CareerConnect India · Independent initiative</span></div></footer>

    {selected && <div className="overlay" onMouseDown={e => {if(e.target===e.currentTarget)setSelected(null);}}><div className="modal">
      <button className="modal-close" onClick={() => setSelected(null)}><X/></button><div className="job-category">{selected.category}</div><h2>{selected.title}</h2><p className="company-name">{selected.company}</p>
      <div className="detail-meta"><span><MapPin size={15}/>{selected.location}</span><span><BriefcaseBusiness size={15}/>{selected.type}</span><span><IndianRupee size={15}/>{selected.salary}</span></div>
      <h4>About this opportunity</h4><p>{selected.description}</p><h4>Skills / eligibility</h4><div className="skill-tags">{(selected.skills||[]).map(s=><span key={s}>{s}</span>)}</div>
      <p className="small-muted">Experience: {selected.experience} · Posted: {selected.posted}</p>
      <a className="primary-btn apply-btn" href={selected.apply} target="_blank" rel="noreferrer">Continue to application <ArrowUpRight size={17}/></a>
    </div></div>}

    {showPost && <div className="overlay" onMouseDown={e => {if(e.target===e.currentTarget)setShowPost(false);}}><form className="modal post-modal" onSubmit={postJob}>
      <button type="button" className="modal-close" onClick={() => setShowPost(false)}><X/></button><div className="kicker">EMPLOYER CORNER</div><h2>Submit a vacancy</h2><p className="small-muted">This preview saves the sample listing only in your current browser. Public submission and admin approval will be connected in the next development phase.</p>
      <div className="form-grid">
        <label>Job title *<input name="title" required placeholder="e.g. Graduate Engineer Trainee"/></label>
        <label>Company name *<input name="company" required placeholder="Company / organisation"/></label>
        <label>Location *<input name="location" required placeholder="City, state or Remote"/></label>
        <label>Opportunity type<select name="type"><option>Full-time</option><option>Internship</option></select></label>
        <label>Category<select name="category">{categories.slice(1).map(c=><option key={c}>{c}</option>)}</select></label>
        <label>Experience level<input name="experience" placeholder="Fresher / 2–4 years"/></label>
        <label>Salary / stipend<input name="salary" placeholder="e.g. ₹4–6 LPA"/></label>
        <label>Skills (comma separated)<input name="skills" placeholder="Python, communication, Excel"/></label>
        <label className="full">Job description *<textarea name="description" required rows="4" placeholder="Describe responsibilities, eligibility and application deadline."/></label>
        <label className="full">Application URL<input name="apply" type="url" placeholder="https://..."/></label>
      </div>
      <button className="primary-btn submit-btn" type="submit">Add to preview <ArrowUpRight size={17}/></button>
    </form></div>}
  </div>;
}

export default App;
