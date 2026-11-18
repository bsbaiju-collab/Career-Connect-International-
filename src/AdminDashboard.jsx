import React, { useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const page = {
  minHeight: "100vh",
  background: "#f4f7fb",
  color: "#172033",
  fontFamily: "Arial, sans-serif"
};
const header = {
  background: "#102b4e",
  color: "#fff",
  padding: "18px 5%",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 12,
  flexWrap: "wrap"
};
const button = {
  border: 0,
  borderRadius: 8,
  padding: "10px 15px",
  fontWeight: 700,
  cursor: "pointer",
  background: "#1769aa",
  color: "#fff"
};
const secondary = {
  ...button,
  background: "#fff",
  color: "#18324f",
  border: "1px solid #cbd5e1"
};
const content = { width: "90%", maxWidth: 1120, margin: "26px auto" };
const panel = {
  background: "#fff",
  border: "1px solid #e1e8f0",
  borderRadius: 12,
  padding: 18,
  marginBottom: 16,
  boxShadow: "0 3px 14px rgba(20,40,70,.04)"
};
const muted = { color: "#64748b", fontSize: 13, lineHeight: 1.5 };
const errorStyle = {
  color: "#b42318",
  background: "#fff1f0",
  padding: 10,
  borderRadius: 8,
  marginBottom: 14
};
const successStyle = {
  color: "#17633a",
  background: "#ecfdf3",
  padding: 10,
  borderRadius: 8,
  marginBottom: 14
};
const sectionTitle = { color: "#173d68", marginTop: 26 };

export default function AdminDashboard({ onSignOut }) {
  const [jobs, setJobs] = useState([]);
  const [employers, setEmployers] = useState([]);
  const [loadingJobs, setLoadingJobs] = useState(true);
  const [loadingEmployers, setLoadingEmployers] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPendingJobs() {
    setLoadingJobs(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("jobs")
      .select("*, employers(organisation_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Jobs: ${queryError.message}`);
      setJobs([]);
    } else {
      setJobs(data || []);
    }
    setLoadingJobs(false);
  }

  async function loadPendingEmployers() {
    setLoadingEmployers(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("employers")
      .select("*")
      .eq("verification_status", "pending")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(`Employers: ${queryError.message}`);
      setEmployers([]);
      setLoadingEmployers(false);
      return;
    }

    const rows = data || [];
    const ownerIds = [...new Set(rows.map((item) => item.owner_id).filter(Boolean))];
    let profileMap = {};

    if (ownerIds.length > 0) {
      const { data: profiles, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, phone, city, state")
        .in("id", ownerIds);

      if (profileError) {
        setError(`Employer contact details: ${profileError.message}`);
      } else {
        profileMap = Object.fromEntries((profiles || []).map((profile) => [profile.id, profile]));
      }
    }

    setEmployers(rows.map((item) => ({
      ...item,
      owner_profile: profileMap[item.owner_id] || null
    })));
    setLoadingEmployers(false);
  }

  async function refreshAll() {
    await Promise.all([loadPendingJobs(), loadPendingEmployers()]);
  }

  useEffect(() => {
    refreshAll();
  }, []);

  async function reviewJob(job, decision) {
    const confirmed = window.confirm(
      `${decision === "approved" ? "Approve" : "Reject"} this job: ${job.title}?`
    );
    if (!confirmed) return;

    setBusyId(job.id);
    setError("");
    setMessage("");
    const { data: userData } = await supabase.auth.getUser();
    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: decision,
        reviewed_by: userData.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", job.id)
      .eq("status", "pending");

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(decision === "approved"
        ? "Job approved. It can now appear publicly."
        : "Job rejected.");
      await loadPendingJobs();
    }
    setBusyId("");
  }

  async function reviewEmployer(employer, decision) {
    const action = decision === "verified" ? "verify" : "reject";
    const confirmed = window.confirm(
      `${action === "verify" ? "Verify" : "Reject"} ${employer.organisation_name}?`
    );
    if (!confirmed) return;

    setBusyId(employer.id);
    setError("");
    setMessage("");

    const { data, error: updateError } = await supabase
      .from("employers")
      .update({ verification_status: decision })
      .eq("id", employer.id)
      .eq("verification_status", "pending")
      .select("id");

    if (updateError) {
      setError(updateError.message);
    } else if (!data || data.length === 0) {
      setError("No employer record was changed. Refresh the list and try again.");
    } else {
      setMessage(decision === "verified"
        ? `${employer.organisation_name} has been verified.`
        : `${employer.organisation_name} has been rejected.`);
      await loadPendingEmployers();
    }
    setBusyId("");
  }

  return (
    <div style={page}>
      <header style={header}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800 }}>CareerConnect India</div>
          <div style={{ color: "#c8d8eb", fontSize: 12, marginTop: 4 }}>
            Administrator Dashboard
          </div>
        </div>
        <button style={secondary} onClick={onSignOut}>Sign out</button>
      </header>

      <main style={content}>
        <section style={panel}>
          <h1 style={{ marginTop: 0, color: "#173d68" }}>Admin Dashboard</h1>
          <p style={muted}>
            Verify employer organisations and review vacancies before publication.
          </p>
          <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1769aa" }}>
                {employers.length}
              </div>
              <div style={muted}>Employers awaiting verification</div>
            </div>
            <div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#1769aa" }}>
                {jobs.length}
              </div>
              <div style={muted}>Jobs waiting for approval</div>
            </div>
          </div>
          <button style={{ ...button, marginTop: 14 }} onClick={refreshAll}>
            Refresh dashboard
          </button>
        </section>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}

        <h2 style={sectionTitle}>Pending employer verification</h2>
        {loadingEmployers ? (
          <section style={panel}>Loading employers…</section>
        ) : employers.length === 0 ? (
          <section style={panel}>No employers are currently waiting for verification.</section>
        ) : (
          employers.map((employer) => (
            <article key={employer.id} style={panel}>
              <h3 style={{ marginTop: 0, color: "#173d68" }}>
                {employer.organisation_name}
              </h3>
              <p><strong>Contact person:</strong> {employer.owner_profile?.full_name || "Not available"}</p>
              <p><strong>Phone:</strong> {employer.owner_profile?.phone || "Not provided"}</p>
              <p><strong>Location:</strong> {[employer.owner_profile?.city, employer.owner_profile?.state].filter(Boolean).join(", ") || "Not provided"}</p>
              <p><strong>Industry:</strong> {employer.industry || "Not specified"}</p>
              <p><strong>Website:</strong> {employer.website
                ? <a href={employer.website} target="_blank" rel="noreferrer">{employer.website}</a>
                : "Not provided"}</p>
              <p><strong>Submitted:</strong> {employer.created_at
                ? new Date(employer.created_at).toLocaleString()
                : "Date unavailable"}</p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <button
                  style={button}
                  disabled={busyId === employer.id}
                  onClick={() => reviewEmployer(employer, "verified")}
                >
                  {busyId === employer.id ? "Please wait…" : "Verify employer"}
                </button>
                <button
                  style={{ ...button, background: "#b42318" }}
                  disabled={busyId === employer.id}
                  onClick={() => reviewEmployer(employer, "rejected")}
                >
                  Reject employer
                </button>
              </div>
            </article>
          ))
        )}

        <h2 style={sectionTitle}>Pending job approvals</h2>
        {loadingJobs ? (
          <section style={panel}>Loading pending jobs…</section>
        ) : jobs.length === 0 ? (
          <section style={panel}>No jobs are currently waiting for approval.</section>
        ) : (
          jobs.map((job) => {
            const employer = Array.isArray(job.employers)
              ? job.employers[0]
              : job.employers;
            return (
              <article key={job.id} style={panel}>
                <h3 style={{ marginTop: 0, color: "#173d68" }}>{job.title}</h3>
                <p><strong>Organisation:</strong> {employer?.organisation_name || "Not available"}</p>
                <p style={muted}>
                  {[job.location_city, job.location_state].filter(Boolean).join(", ")}
                  {" · "}{job.opportunity_type || "Opportunity"}
                  {" · "}{job.work_mode || "Work mode not specified"}
                </p>
                <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
                  {job.description}
                </p>
                <p><strong>Category:</strong> {job.category || "Not specified"}</p>
                <p><strong>Skills:</strong> {(job.skills || []).join(", ") || "Not specified"}</p>
                <p style={muted}>
                  Submitted: {job.created_at
                    ? new Date(job.created_at).toLocaleString()
                    : "Date unavailable"}
                </p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button
                    style={button}
                    disabled={busyId === job.id}
                    onClick={() => reviewJob(job, "approved")}
                  >
                    {busyId === job.id ? "Please wait…" : "Approve job"}
                  </button>
                  <button
                    style={{ ...button, background: "#b42318" }}
                    disabled={busyId === job.id}
                    onClick={() => reviewJob(job, "rejected")}
                  >
                    Reject job
                  </button>
                </div>
              </article>
            );
          })
        )}
      </main>
    </div>
  );
}
