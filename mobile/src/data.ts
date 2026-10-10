import { Profile } from "./store";

export const educationLevels = ["Class 10", "Class 12", "Diploma", "Undergraduate", "Postgraduate"];
export const skills = ["Python", "JavaScript", "Java", "C++", "HTML/CSS", "SQL", "Excel", "Data Analysis", "Communication", "Problem Solving", "Digital Marketing", "Graphic Design"];
export const interests = ["Technology", "Finance", "Marketing", "Business", "Healthcare", "Education", "Design", "Social Impact"];
export const locations = ["Any location", "Delhi NCR", "Mumbai", "Bengaluru", "Hyderabad", "Pune", "Chennai", "Kolkata"];
export const workModes = ["On-site", "Hybrid", "Remote"] as const;

export type Internship = {
  id: number; title: string; company: string; domain: string; skills: string[];
  mode: "On-site" | "Hybrid" | "Remote"; city: string; stipend: string; duration: string;
};

export const internships: Internship[] = [
  { id: 1, title: "Frontend Developer Intern", company: "PixelForge Labs", domain: "Technology", skills: ["JavaScript", "HTML/CSS"], mode: "Remote", city: "Bengaluru", stipend: "₹15,000/mo", duration: "3 months" },
  { id: 2, title: "Data Analyst Intern", company: "InsightLoop", domain: "Technology", skills: ["Python", "SQL", "Data Analysis", "Excel"], mode: "Hybrid", city: "Pune", stipend: "₹12,000/mo", duration: "6 months" },
  { id: 3, title: "Backend Engineering Intern", company: "CloudNest", domain: "Technology", skills: ["Java", "SQL", "Problem Solving"], mode: "On-site", city: "Hyderabad", stipend: "₹20,000/mo", duration: "6 months" },
  { id: 4, title: "Financial Research Intern", company: "Arthaveda Capital", domain: "Finance", skills: ["Excel", "Data Analysis", "Communication"], mode: "On-site", city: "Mumbai", stipend: "₹18,000/mo", duration: "2 months" },
  { id: 5, title: "Digital Marketing Intern", company: "BrandBridge", domain: "Marketing", skills: ["Digital Marketing", "Communication", "Graphic Design"], mode: "Remote", city: "Delhi NCR", stipend: "₹8,000/mo", duration: "3 months" },
  { id: 6, title: "Business Development Intern", company: "ScaleUp India", domain: "Business", skills: ["Communication", "Problem Solving", "Excel"], mode: "Hybrid", city: "Delhi NCR", stipend: "₹10,000/mo", duration: "3 months" },
  { id: 7, title: "Health Data Intern", company: "CareLink Health", domain: "Healthcare", skills: ["Data Analysis", "Python", "Communication"], mode: "Hybrid", city: "Chennai", stipend: "₹10,000/mo", duration: "4 months" },
  { id: 8, title: "Curriculum Content Intern", company: "LearnLeaf", domain: "Education", skills: ["Communication", "Problem Solving"], mode: "Remote", city: "Kolkata", stipend: "₹7,000/mo", duration: "3 months" },
  { id: 9, title: "UI/UX Design Intern", company: "Studio Sutra", domain: "Design", skills: ["Graphic Design", "HTML/CSS", "Communication"], mode: "Hybrid", city: "Bengaluru", stipend: "₹14,000/mo", duration: "4 months" },
  { id: 10, title: "Community Outreach Intern", company: "Pragati Foundation", domain: "Social Impact", skills: ["Communication", "Problem Solving"], mode: "On-site", city: "Pune", stipend: "₹6,000/mo", duration: "2 months" },
  { id: 11, title: "C++ Systems Intern", company: "KernelWorks", domain: "Technology", skills: ["C++", "Problem Solving"], mode: "On-site", city: "Bengaluru", stipend: "₹22,000/mo", duration: "6 months" },
  { id: 12, title: "Growth Analytics Intern", company: "FunnelFox", domain: "Marketing", skills: ["Data Analysis", "SQL", "Digital Marketing"], mode: "Remote", city: "Mumbai", stipend: "₹12,000/mo", duration: "3 months" },
];

export function score(job: Internship, p: Profile): number {
  const mySkills = p.skills ?? [];
  const domainPts = (p.domains ?? []).includes(job.domain) ? 35 : (p.interests ?? []).includes(job.domain) ? 20 : 0;
  const skillPts = Math.round((job.skills.filter((s) => mySkills.includes(s)).length / job.skills.length) * 40);
  const modePts = !p.workMode || p.workMode === job.mode ? 15 : 0;
  const anyLoc = !p.location || p.location === "Any location";
  const locPts = anyLoc || p.location === job.city || p.relocate === "Yes" ? 10 : 0;
  return Math.min(99, domainPts + skillPts + modePts + locPts);
}
