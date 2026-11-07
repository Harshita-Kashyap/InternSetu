"use client";

import { useEffect, useState } from "react";
import { Link, useRouter } from "../../../i18n/navigation";
import { useT } from "../../../i18n/useT";
import { useLocale } from "next-intl";
import Header from "../../components/Header";
import Ring from "../../components/Ring";
import { useToast } from "../../components/Toast";
import { api, ApiError, RecommendationsResponse } from "../../lib/api";

export default function RecommendationsPage() {
  const tr = useT();
  const locale = useLocale();
  const router = useRouter();
  const { toast, show } = useToast();

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [saved, setSaved] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        setData(await api.recommendations(undefined, locale));

        setSaved(
          ((await api.saved()) as { internship_id: string }[]).map(
            (s) => s.internship_id
          )
        );
      } catch (e) {
        if (e instanceof ApiError && e.code === "profile_incomplete") {
          return router.replace("/profile");
        }

        if (e instanceof ApiError && e.code === "consent_required") {
          return router.replace("/consent");
        }

        show(
          e instanceof ApiError
            ? e.message
            : tr("Could not load recommendations.")
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [router, show, locale]);

  const toggleSave = async (id: string) => {
    const on = saved.includes(id);

    try {
      await (on ? api.unsave(id) : api.save(id));

      setSaved((prev) =>
        on ? prev.filter((x) => x !== id) : [...prev, id]
      );

      show(
        on ? tr("Removed from saved.") : tr("Saved for later."),
        "success"
      );
    } catch (e) {
      show(
        e instanceof ApiError
          ? e.message
          : tr("Could not update saved list.")
      );
    }
  };

  const recs = data?.recommendations ?? [];

  // Prepare and sort skills that would improve internship matches.
  const helpfulSkills = Array.from(
    new Map(
      (data?.skill_gap_summary ?? []).map((skill) => [
        skill.skill_id,
        {
          ...skill,
          count: Number(skill.count) || 0,
        },
      ])
    ).values()
  ).sort((a, b) => b.count - a.count || a.skill.localeCompare(b.skill));

  return (
    <main className="profile-page">
      <Header label={tr("Your Recommendations")} />

      <section className="reco-wrap">
        {/* Recommendations Hero */}
        <div className="reco-hero card-rise">
          <div>
            <p className="profile-eyebrow">
              {tr("PERSONALISED FOR YOU")}
            </p>

            <h1>{tr("Your internship matches")}</h1>

            <p className="reco-sub">
              {data?.message ||
                tr("Based on your education, skills and preferences.")}
            </p>

            <div className="reco-actions">
              <Link href="/saved" className="apply-btn">
                ♥ {tr("Saved")}
              </Link>

              <Link href="/profile/edit" className="reco-edit">
                {tr("Edit profile")}
              </Link>

              <Link href="/profile/preferences" className="reco-edit">
                {tr("Change preferences")}
              </Link>
            </div>
          </div>

          <div className="reco-stats">
            <div>
              <b>{data?.eligible_count ?? 0}</b>
              <span>{tr("Eligible")}</span>
            </div>

            <div>
              <b>{recs.length}</b>
              <span>{tr("Top matches")}</span>
            </div>
          </div>
        </div>

        {data?.demo_notice && (
          <p className="field-hint">{data.demo_notice}</p>
        )}

        {loading && <p>{tr("Loading…")}</p>}

        {!loading && recs.length === 0 && (
          <p>
            {tr(
              "No eligible internships yet. Try adding more skills or another city."
            )}
          </p>
        )}

        {/* Closest Matches */}
        {!loading &&
          recs.length === 0 &&
          (data?.nearest?.length ?? 0) > 0 && (
            <div className="job-grid">
              <h2 style={{ gridColumn: "1 / -1" }}>
                {tr("Closest matches")}
              </h2>

              {data!.nearest!.map((n) => (
                <article className="job-card" key={n.internship_id}>
                  <div className="job-title">
                    <h3>{n.title}</h3>
                    <p>
                      {n.company_name} · {n.location_name}
                    </p>
                  </div>

                  <p>{n.reason}</p>

                  {n.missing_mandatory.length > 0 && (
                    <div className="job-skills">
                      <b>{tr("Missing required skills:")}</b>{" "}
                      {n.missing_mandatory.map((m) => (
                        <span className="skill-pill" key={m}>
                          {m}
                        </span>
                      ))}
                    </div>
                  )}
                </article>
              ))}
            </div>
          )}

        {/* Recommended Internships */}
        <div className="job-grid stagger">
          {recs.map((j) => (
            <article className="job-card" key={j.internship_id}>
              <div className="job-top">
                <div className="job-avatar">
                  {j.company_name.charAt(0)}
                </div>

                <div className="job-title">
                  <h3>{j.title}</h3>
                  <p>
                    {j.company_name} · {j.location_name}
                  </p>
                </div>

                <Ring value={j.match_percentage} />
              </div>

              <div className="job-tags">
                <span className="tag tag-domain">{j.sector_name}</span>

                {j.duration && <span className="tag">{j.duration}</span>}

                {j.match_tag && <span className="tag">{j.match_tag}</span>}

                {j.is_demo_data && (
                  <span className="tag">{tr("Demo data")}</span>
                )}
              </div>

              <div style={{ marginTop: 16 }}>
                <h4>{tr("Why this matches")}</h4>

                {j.why_recommended.length > 0 ? (
                  <ul>
                    {j.why_recommended.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    {tr("Build relevant skills to improve this match.")}
                  </p>
                )}

                {j.considerations.length > 0 && (
                  <ul>
                    {j.considerations.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                )}

                <h4>{tr("Skills to improve")}</h4>

                {[
                  ...j.skill_gap.missing_mandatory,
                  ...j.skill_gap.missing_preferred,
                ].length > 0 ? (
                  <div className="job-skills">
                    {[
                      ...new Set([
                        ...j.skill_gap.missing_mandatory,
                        ...j.skill_gap.missing_preferred,
                      ]),
                    ].map((s) => (
                      <small key={s}>{s}</small>
                    ))}
                  </div>
                ) : (
                  <p>{tr("You have all the listed skills.")}</p>
                )}
              </div>

              <div className="job-bottom">
                <strong>
                  {j.stipend_inr_per_month
                    ? `₹${j.stipend_inr_per_month.toLocaleString("en-IN")}/mo`
                    : tr("Stipend not listed")}
                </strong>

                <div>
                  <button
                    type="button"
                    className={`save-btn ${
                      saved.includes(j.internship_id) ? "on" : ""
                    }`}
                    aria-label={tr("Save internship")}
                    aria-pressed={saved.includes(j.internship_id)}
                    onClick={() => toggleSave(j.internship_id)}
                  >
                    {saved.includes(j.internship_id) ? "♥" : "♡"}
                  </button>

                  <a
                    className="apply-btn"
                    href={j.apply_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {tr("Apply on PMIS")}
                  </a>
                </div>
              </div>
            </article>
          ))}
        </div>


        {data?.disclaimer && (
          <p className="field-hint">{data.disclaimer}</p>
        )}
      </section>

      {toast}
    </main>
  );
}