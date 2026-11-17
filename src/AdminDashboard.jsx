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

export default function AdminDashboard({ onSignOut }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadPendingJobs() {
    setLoading(true);
    setError("");
    const { data, error: queryError } = await supabase
      .from("jobs")
      .select("*, employers(organisation_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
      setJobs([]);
    } else {
      setJobs(data || []);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadPendingJobs();
  }, []);

  async function reviewJob(job, decision) {
    const confirmed = window.confirm(
      `${decision === "approved" ? "Approve" : "Reject"} this job: ${job.title}?`
    );
    if (!confirmed) return;

    setBusyId(job.id);
    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("jobs")
      .update({
        status: decision,
        reviewed_by: (await supabase.auth.getUser()).data.user?.id,
        reviewed_at: new Date().toISOString()
      })
      .eq("id", job.id)
      .eq("status", "pending");

    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage(
        decision === "approved"
          ? "Job approved. It can now appear publicly."
          : "Job rejected."
      );
      await loadPendingJobs();
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
            Review employer-submitted vacancies before they are published.
          </p>
          <div style={{ fontSize: 28, fontWeight: 800, color: "#1769aa" }}>
            {jobs.length}
          </div>
          <div style={muted}>Jobs waiting for approval</div>
          <button style={{ ...button, marginTop: 14 }} onClick={loadPendingJobs}>
            Refresh list
          </button>
        </section>

        {error && <div style={errorStyle}>{error}</div>}
        {message && <div style={successStyle}>{message}</div>}

        <h2 style={{ color: "#173d68" }}>Pending job approvals</h2>

        {loading ? (
          <section style={panel}>Loading pending jobs…</section>
        ) : jobs.length === 0 ? (
          <section style={panel}>
            No jobs are currently waiting for approval.
          </section>
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
                  Submitted: {job.created_at ? new Date(job.created_at).toLocaleString() : "Date unavailable"}
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
