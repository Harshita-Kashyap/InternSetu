"""Build the v2 datasets (tracker items #8 and #9). Deterministic: the same --seed gives the same files.

    python -m app.scripts.build_dataset_v2 [--internships 2500] [--candidates 700] [--seed 42]

Writes to backend/data/v2/:
  internsetu_taxonomy_v2.json      v1 taxonomy + Oil & Gas sector, everyday/oil-gas skills, entry-level roles, small towns
  locations_coordinates_v2.csv     v1 coordinates + the new towns
  internsetu_internships_v2.json   PMIS-shaped listings (6/9 months, one fixed stipend from pmis_rules.json, 1-2 mandatory skills)
  internsetu_candidates_v2.json    low-skill / everyday-skill / remote-district profiles (some with Hindi/Hinglish raw inputs)
v1 files are never touched. Load with:  python -m app.scripts.load_datasets --all --dataset v2
All records are synthetic. Company names are invented; coordinates of towns are approximate.
"""
import argparse
import csv
import json
import random
from collections import Counter, defaultdict
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data"
OUT = DATA / "v2"

# ---------------------------------------------------------------- taxonomy additions
SECTOR_OILGAS = {"id": "SEC-026", "name": "Oil & Gas", "aliases": ["Petroleum", "Refinery", "Petrol pump", "Fuel", "तेल और गैस"]}
DOMAIN_OILGAS = {"id": "RD-OIL-GAS", "name": "Oil & Gas Operations"}
CAT_EVERY = {"id": "SKC-EVERY", "name": "Everyday & Practical Skills"}
CAT_OILGAS = {"id": "SKC-OILGAS", "name": "Oil & Gas Operations"}
# (name, aliases incl. Hindi / Hinglish so the normaliser can map typed text)
EVERY = [
    ("Crop Farming", ["farming", "kheti", "kheti bari", "खेती"]),
    ("Livestock & Dairy Care", ["pashupalan", "dairy", "doodh ka kaam", "पशुपालन"]),
    ("Tractor & Pump Operation", ["tractor chalana", "motor pump", "ट्रैक्टर चलाना"]),
    ("Shop Counter & Billing", ["dukaan", "kirana shop", "counter sales", "billing", "दुकान"]),
    ("Tailoring & Stitching", ["silai", "tailoring", "सिलाई"]),
    ("Light Vehicle Driving", ["driving", "gaadi chalana", "bike chalana", "ड्राइविंग"]),
    ("Mobile Phone & UPI Use", ["upi", "phonepe", "digital payment", "mobile banking"]),
    ("Cooking & Food Preparation", ["khana banana", "cooking", "rasoi", "रसोई"]),
    ("Household Electrical Repair", ["bijli ka kaam", "wiring repair", "बिजली का काम"]),
    ("Plumbing & Pipe Fitting", ["nal fitting", "plumber", "नल फिटिंग"]),
    ("Carpentry", ["badhai", "wood work", "बढ़ई"]),
    ("Handloom & Handicraft", ["bunai", "kadhai", "handloom", "हथकरघा"]),
    ("Loading, Packing & Stock Handling", ["packing", "maal uthana", "godown work"]),
    ("Cash Handling & Basic Accounts", ["hisaab kitaab", "khata", "cash counting", "हिसाब किताब"]),
    ("Basic Data Entry & Typing", ["typing", "data entry", "computer typing"]),
    ("Mobile Phone Repair", ["mobile repair", "phone repair"]),
    ("Community Outreach & Local Language", ["gaon mein kaam", "village outreach", "ganv sampark"]),
]
OILGAS = [
    ("Workplace Safety & PPE", ["PPE", "safety gear", "suraksha"]),
    ("Fuel Dispensing & Station Operations", ["petrol pump", "fuel station", "petrol bharna"]),
    ("LPG Cylinder Handling", ["gas cylinder", "LPG delivery", "cylinder delivery"]),
    ("Pipeline Inspection Basics", ["pipeline patrol", "pipeline checking"]),
    ("Pump & Valve Maintenance", ["valve repair", "pump repair"]),
    ("Instrumentation Basics", ["gauges", "pressure gauge reading"]),
    ("Hazard Identification", ["HSE", "risk spotting"]),
]
# (id, name, domain, {sector: weight}, {edu: weight}, mandatory names, preferred names, aliases)
NEW_ROLES = [
    ("ROLE-060", "Farm Field Assistant", "RD-AGRICULTURE-RURAL", {"SEC-006": 1}, {"EDU-10": 35, "EDU-12": 30, "EDU-ITI": 5, "EDU-DIPLOMA": 10},
     ["Crop Farming", "Crop Management"], ["Irrigation Techniques", "Tractor & Pump Operation", "Soil Testing", "Farm Management", "Teamwork", "Hindi Proficiency"], ["kisan sahayak"]),
    ("ROLE-061", "Dairy & Livestock Assistant", "RD-AGRICULTURE-RURAL", {"SEC-006": 1}, {"EDU-10": 40, "EDU-12": 30, "EDU-ITI": 5},
     ["Livestock & Dairy Care", "Animal Husbandry"], ["First Aid", "Cash Handling & Basic Accounts", "Teamwork", "Work Ethic"], ["pashu sahayak"]),
    ("ROLE-062", "Farm Machinery Helper", "RD-AGRICULTURE-RURAL", {"SEC-006": 2, "SEC-003": 1}, {"EDU-10": 30, "EDU-12": 20, "EDU-ITI": 35, "EDU-DIPLOMA": 10},
     ["Tractor & Pump Operation", "Machine Maintenance"], ["Light Vehicle Driving", "Household Electrical Repair", "Workplace Safety & PPE"], []),
    ("ROLE-063", "Counter Sales Assistant", "RD-SALES-BD", {"SEC-007": 3, "SEC-020": 2}, {"EDU-10": 35, "EDU-12": 40, "EDU-UG": 10},
     ["Shop Counter & Billing", "Retail Sales"], ["Cash Handling & Basic Accounts", "Customer Support", "Mobile Phone & UPI Use", "Verbal Communication", "Hindi Proficiency"], ["dukaan sahayak"]),
    ("ROLE-064", "Tailoring & Garment Trainee", "RD-OPERATIONS-SUPPLYCHAIN", {"SEC-008": 3, "SEC-024": 1}, {"EDU-10": 35, "EDU-12": 25, "EDU-ITI": 25},
     ["Tailoring & Stitching"], ["Handloom & Handicraft", "Quality Control", "Attention to Detail", "Creativity"], ["silai sahayak"]),
    ("ROLE-065", "Handloom & Handicraft Assistant", "RD-OPERATIONS-SUPPLYCHAIN", {"SEC-024": 3, "SEC-008": 1}, {"EDU-10": 40, "EDU-12": 35},
     ["Handloom & Handicraft"], ["Tailoring & Stitching", "Attention to Detail", "Creativity", "Cash Handling & Basic Accounts"], []),
    ("ROLE-066", "Fuel Station Assistant", "RD-OIL-GAS", {"SEC-026": 1}, {"EDU-10": 30, "EDU-12": 40, "EDU-ITI": 15},
     ["Fuel Dispensing & Station Operations", "Workplace Safety & PPE"], ["Cash Handling & Basic Accounts", "Customer Support", "Mobile Phone & UPI Use", "Verbal Communication"], ["petrol pump sahayak"]),
    ("ROLE-067", "LPG Distribution Assistant", "RD-OIL-GAS", {"SEC-026": 1}, {"EDU-10": 35, "EDU-12": 35, "EDU-ITI": 15},
     ["LPG Cylinder Handling", "Workplace Safety & PPE"], ["Light Vehicle Driving", "Loading, Packing & Stock Handling", "Customer Support", "Mobile Phone & UPI Use"], []),
    ("ROLE-068", "Pipeline & Terminal Helper", "RD-OIL-GAS", {"SEC-026": 1}, {"EDU-12": 25, "EDU-ITI": 45, "EDU-DIPLOMA": 30},
     ["Pipeline Inspection Basics", "Workplace Safety & PPE"], ["Pump & Valve Maintenance", "Hazard Identification", "Instrumentation Basics", "Machine Maintenance"], []),
    ("ROLE-069", "Refinery Operations Trainee", "RD-OIL-GAS", {"SEC-026": 3, "SEC-023": 1}, {"EDU-ITI": 40, "EDU-DIPLOMA": 45, "EDU-12": 15},
     ["Pump & Valve Maintenance", "Instrumentation Basics"], ["Machine Maintenance", "Hazard Identification", "Applied Thermodynamics", "Workplace Safety & PPE"], []),
    ("ROLE-070", "Warehouse & Packing Assistant", "RD-OPERATIONS-SUPPLYCHAIN", {"SEC-016": 2, "SEC-020": 1, "SEC-007": 1}, {"EDU-10": 35, "EDU-12": 40, "EDU-ITI": 15},
     ["Loading, Packing & Stock Handling"], ["Inventory Management", "Warehouse Management", "Attention to Detail", "Teamwork"], ["godown sahayak"]),
    ("ROLE-071", "Delivery & Dispatch Assistant", "RD-OPERATIONS-SUPPLYCHAIN", {"SEC-016": 2, "SEC-007": 1}, {"EDU-10": 35, "EDU-12": 50},
     ["Light Vehicle Driving", "Mobile Phone & UPI Use"], ["Logistics Coordination", "Customer Support", "Time Management"], []),
    ("ROLE-072", "Kitchen & Food Preparation Trainee", "RD-HOSPITALITY-TOURISM", {"SEC-012": 1}, {"EDU-10": 40, "EDU-12": 40, "EDU-ITI": 10},
     ["Cooking & Food Preparation"], ["Food & Beverage Service", "Housekeeping Management", "First Aid", "Teamwork"], ["rasoi sahayak"]),
    ("ROLE-073", "Data Entry Operator", "RD-OPERATIONS-SUPPLYCHAIN", {"SEC-002": 2, "SEC-017": 2, "SEC-014": 1, "SEC-005": 1}, {"EDU-12": 45, "EDU-UG": 40, "EDU-DIPLOMA": 10},
     ["Basic Data Entry & Typing", "Typing Speed & Accuracy"], ["Microsoft Excel (Basic)", "Document Management", "Attention to Detail", "Hindi Proficiency"], []),
    ("ROLE-074", "Bank Mitra / Digital Payments Assistant", "RD-FINANCE-ACCOUNTS", {"SEC-002": 1}, {"EDU-12": 50, "EDU-UG": 40},
     ["Mobile Phone & UPI Use", "Banking Operations"], ["Cash Handling & Basic Accounts", "Customer Support", "Verbal Communication", "Government Scheme Awareness"], []),
    ("ROLE-075", "Solar Installation Helper", "RD-ENGINEERING", {"SEC-011": 2, "SEC-010": 1}, {"EDU-ITI": 45, "EDU-DIPLOMA": 25, "EDU-12": 30},
     ["Electrical Wiring", "Renewable Energy Systems"], ["Workplace Safety & PPE", "Renewable Energy Awareness", "Household Electrical Repair", "Teamwork"], []),
    ("ROLE-076", "Mobile Repair Helper", "RD-ENGINEERING", {"SEC-022": 2, "SEC-015": 1, "SEC-007": 1}, {"EDU-10": 25, "EDU-12": 40, "EDU-ITI": 35},
     ["Mobile Phone Repair"], ["Circuit Design", "Customer Support", "Attention to Detail", "Cash Handling & Basic Accounts"], []),
    ("ROLE-077", "Community Health Assistant", "RD-HEALTHCARE", {"SEC-005": 1, "SEC-025": 1}, {"EDU-12": 80, "EDU-10": 10, "EDU-UG": 10},
     ["First Aid", "Public Health Awareness"], ["Patient Care", "Community Outreach & Local Language", "Hindi Proficiency", "Regional Language Proficiency"], ["asha sahayak"]),
    ("ROLE-078", "Telecom Tower Helper", "RD-ENGINEERING", {"SEC-015": 1}, {"EDU-ITI": 55, "EDU-12": 30, "EDU-DIPLOMA": 15},
     ["Electrical Wiring", "Workplace Safety & PPE"], ["Light Vehicle Driving", "Circuit Design", "Teamwork"], []),
    ("ROLE-079", "Construction Mason Helper", "RD-CONSTRUCTION-INFRA", {"SEC-009": 1}, {"EDU-10": 55, "EDU-ITI": 35, "EDU-12": 10},
     ["Construction Safety"], ["Surveying", "Loading, Packing & Stock Handling", "Site Supervision", "Teamwork"], ["rajmistri sahayak"]),
    ("ROLE-080", "Electrician Helper", "RD-ENGINEERING", {"SEC-010": 1, "SEC-022": 1, "SEC-009": 1}, {"EDU-ITI": 55, "EDU-10": 20, "EDU-12": 25},
     ["Electrical Wiring"], ["Household Electrical Repair", "Workplace Safety & PPE", "Machine Maintenance"], ["bijli mistri sahayak"]),
    ("ROLE-081", "Plumbing & Pipe Fitting Trainee", "RD-CONSTRUCTION-INFRA", {"SEC-009": 1}, {"EDU-ITI": 55, "EDU-10": 45},
     ["Plumbing & Pipe Fitting"], ["Construction Safety", "Workplace Safety & PPE"], []),
    ("ROLE-082", "Carpentry Trainee", "RD-CONSTRUCTION-INFRA", {"SEC-009": 1, "SEC-024": 1}, {"EDU-ITI": 50, "EDU-10": 50},
     ["Carpentry"], ["Handloom & Handicraft", "Attention to Detail", "Construction Safety"], []),
    ("ROLE-083", "Village Outreach Assistant", "RD-GOVERNMENT-PUBLIC-SECTOR", {"SEC-025": 2, "SEC-017": 1}, {"EDU-12": 60, "EDU-10": 25, "EDU-UG": 15},
     ["Community Outreach & Local Language", "Government Scheme Awareness"], ["Hindi Proficiency", "Regional Language Proficiency", "Public Health Awareness", "Verbal Communication"], []),
]
# existing roles that should offer many 10th/12th/ITI/Diploma listings
LOW_EDU_ROLES = {"ROLE-004", "ROLE-005", "ROLE-011", "ROLE-012", "ROLE-013", "ROLE-014", "ROLE-015", "ROLE-016", "ROLE-017", "ROLE-019", "ROLE-022",
                 "ROLE-026", "ROLE-028", "ROLE-030", "ROLE-031", "ROLE-035", "ROLE-036", "ROLE-037", "ROLE-038", "ROLE-039", "ROLE-040", "ROLE-042",
                 "ROLE-045", "ROLE-046", "ROLE-050", "ROLE-051", "ROLE-052", "ROLE-053", "ROLE-054", "ROLE-055", "ROLE-056"}
ITI_OK = {"ROLE-005", "ROLE-012", "ROLE-013", "ROLE-014", "ROLE-015", "ROLE-016", "ROLE-035", "ROLE-037", "ROLE-056", "ROLE-053", "ROLE-028"}
DIP_OK = ITI_OK | {"ROLE-004", "ROLE-011", "ROLE-036", "ROLE-022", "ROLE-040"}
OILGAS_EXTRA = {"ROLE-035": 1, "ROLE-016": 1, "ROLE-012": 1, "ROLE-013": 1, "ROLE-037": 1}   # existing roles that also exist in Oil & Gas
SECTOR_BOOST = {"SEC-026": 2.0}

# (id, name, state, lat, lng, remote?)
TOWNS = [
    ("LAT", "Latur", "LOC-STATE-MH", 18.40, 76.58, 0), ("SAT", "Satara", "LOC-STATE-MH", 17.68, 74.00, 0), ("YAV", "Yavatmal", "LOC-STATE-MH", 20.39, 78.13, 0),
    ("GAD", "Gadchiroli", "LOC-STATE-MH", 20.18, 80.00, 1), ("SGR", "Sagar", "LOC-STATE-MP", 23.84, 78.74, 0), ("REW", "Rewa", "LOC-STATE-MP", 24.53, 81.30, 0),
    ("CHH", "Chhindwara", "LOC-STATE-MP", 22.06, 78.94, 0), ("SHV", "Shivpuri", "LOC-STATE-MP", 25.43, 77.66, 0), ("BET", "Betul", "LOC-STATE-MP", 21.91, 77.90, 0),
    ("MAN", "Mandla", "LOC-STATE-MP", 22.60, 80.37, 1), ("JHA", "Jhansi", "LOC-STATE-UP", 25.45, 78.57, 0), ("MIR", "Mirzapur", "LOC-STATE-UP", 25.15, 82.57, 0),
    ("BAH", "Bahraich", "LOC-STATE-UP", 27.57, 81.60, 1), ("AZA", "Azamgarh", "LOC-STATE-UP", 26.07, 83.19, 0), ("MTH", "Mathura", "LOC-STATE-UP", 27.49, 77.67, 0),
    ("SIT", "Sitamarhi", "LOC-STATE-BR", 26.59, 85.49, 0), ("ARA", "Araria", "LOC-STATE-BR", 26.15, 87.47, 1), ("PUR", "Purnia", "LOC-STATE-BR", 25.78, 87.47, 0),
    ("BEG", "Begusarai", "LOC-STATE-BR", 25.42, 86.13, 0), ("DUM", "Dumka", "LOC-STATE-JH", 24.27, 87.25, 1), ("GUM", "Gumla", "LOC-STATE-JH", 23.04, 84.54, 1),
    ("KOR", "Koraput", "LOC-STATE-OD", 18.81, 82.71, 1), ("BHW", "Bhawanipatna", "LOC-STATE-OD", 19.91, 83.17, 1), ("BAR", "Baripada", "LOC-STATE-OD", 21.93, 86.72, 1),
    ("PAR", "Paradip", "LOC-STATE-OD", 20.32, 86.61, 0), ("JAG", "Jagdalpur", "LOC-STATE-CG", 19.07, 82.03, 1), ("KRB", "Korba", "LOC-STATE-CG", 22.35, 82.68, 0),
    ("BMR", "Barmer", "LOC-STATE-RJ", 25.75, 71.39, 1), ("BUN", "Bundi", "LOC-STATE-RJ", 25.44, 75.64, 0), ("BNS", "Banswara", "LOC-STATE-RJ", 23.55, 74.44, 1),
    ("BHJ", "Bhuj", "LOC-STATE-GJ", 23.25, 69.67, 0), ("DAH", "Dahod", "LOC-STATE-GJ", 22.84, 74.26, 1), ("JAN", "Jamnagar", "LOC-STATE-GJ", 22.47, 70.07, 0),
    ("TIN", "Tinsukia", "LOC-STATE-AS", 27.49, 95.36, 0), ("DGB", "Digboi", "LOC-STATE-AS", 27.39, 95.62, 0), ("BGN", "Bongaigaon", "LOC-STATE-AS", 26.48, 90.56, 0),
    ("PNP", "Panipat", "LOC-STATE-HR", 29.39, 76.97, 0), ("HAL", "Haldia", "LOC-STATE-WB", 22.06, 88.07, 0), ("PRL", "Purulia", "LOC-STATE-WB", 23.33, 86.36, 1),
    ("MNG", "Mangaluru", "LOC-STATE-KA", 12.91, 74.86, 0), ("CKM", "Chikkamagaluru", "LOC-STATE-KA", 13.32, 75.77, 0), ("KOP", "Koppal", "LOC-STATE-KA", 15.35, 76.15, 0),
    ("THE", "Theni", "LOC-STATE-TN", 10.01, 77.48, 0), ("NGP", "Nagapattinam", "LOC-STATE-TN", 10.77, 79.84, 0), ("WAY", "Kalpetta (Wayanad)", "LOC-STATE-KL", 11.61, 76.08, 1),
    ("MND", "Mandi", "LOC-STATE-HP", 31.71, 76.93, 1), ("PIT", "Pithoragarh", "LOC-STATE-UK", 29.58, 80.22, 1), ("TUR", "Tura", "LOC-STATE-ML", 25.51, 90.22, 1),
    ("LUN", "Lunglei", "LOC-STATE-MZ", 22.88, 92.74, 1), ("ANA", "Anantapur", "LOC-STATE-AP", 14.68, 77.60, 0), ("SRK", "Srikakulam", "LOC-STATE-AP", 18.30, 83.90, 0),
    ("ADI", "Adilabad", "LOC-STATE-TG", 19.67, 78.53, 1), ("BTI", "Bathinda", "LOC-STATE-PB", 30.21, 74.95, 0),
]
OILGAS_TOWNS = ["LOC-CITY-JAN", "LOC-CITY-PNP", "LOC-CITY-MTH", "LOC-CITY-HAL", "LOC-CITY-PAR", "LOC-CITY-MNG", "LOC-CITY-DGB", "LOC-CITY-BEG", "LOC-CITY-BGN",
                "LOC-CITY-KOC", "LOC-CITY-VAD", "LOC-CITY-MUM", "LOC-CITY-BHJ"]
REMOTE = {f"LOC-CITY-{t[0]}" for t in TOWNS if t[5]}
SMALL = [f"LOC-CITY-{t[0]}" for t in TOWNS]
FOOD, STAY, TRANSPORT, TRANSPORT2 = ("Meals provided on working days", "Accommodation assistance for outstation interns", "Travel allowance", "Company transport from nearby town")
OTHER_FAC = ["Certificate of Completion", "Mentorship support", "Structured skill training sessions", "Group health/accident insurance cover", "Letter of Recommendation"]
FIRST = ["Shree", "Jai", "Bharat", "Kisan", "Sagar", "Anand", "Gram", "Nav", "Surya", "Ganga", "Vindhya", "Deccan", "Himalaya", "Malwa", "Konkan", "Kaveri", "Narmada", "Arya", "Utkal", "Sahyadri"]
SECOND = {"SEC-006": ["Agro", "Farms", "Dairy", "Seeds"], "SEC-026": ["Petro", "Fuels", "Gas", "Energy"], "SEC-008": ["Textiles", "Garments", "Looms"],
          "SEC-016": ["Logistics", "Carriers", "Freight"], "SEC-002": ["Finserv", "Capital", "Credit"], "SEC-012": ["Hospitality", "Hotels", "Resorts"]}
DEFAULT_SECOND = ["Industries", "Enterprises", "Works", "Services", "Solutions", "Traders"]
SUFFIX = ["Pvt Ltd", "Ltd", "& Sons", "Co-operative", "Enterprises", "LLP"]
VARIANTS = ["", "", "", " - Entry Level", " (Trainee)", " - Junior", " - Regional Office"]


def wchoice(rng, d):
    keys = list(d)
    return rng.choices(keys, weights=[d[k] for k in keys])[0]


def build_taxonomy(v1):
    t = json.loads(json.dumps(v1))
    t["taxonomy_meta"].update({"name": "InternSetu Master Taxonomy (v2 additive)", "version": "2.0.0",
                               "v2_note": "Adds Oil & Gas, everyday and oil-gas skills, entry-level roles and small towns. No v1 id is changed or removed."})
    t["sectors"].append(SECTOR_OILGAS)
    t["role_domains"].append(DOMAIN_OILGAS)
    t["skill_categories"] += [CAT_EVERY, CAT_OILGAS]
    for prefix, cat, items in (("EVERY", CAT_EVERY, EVERY), ("OILGAS", CAT_OILGAS, OILGAS)):
        for n, (name, al) in enumerate(items, 1):
            t["skills"].append({"id": f"SK-{prefix}-{n:03d}", "name": name, "category": cat["id"], "aliases": al})
    skill_id = {s["name"]: s["id"] for s in t["skills"]}
    for rid, name, dom, _sec, _edu, mand, pref, al in NEW_ROLES:
        for s in mand + pref:
            assert s in skill_id, f"unknown skill name {s!r} in {name}"
        t["roles"].append({"id": rid, "name": name, "domain": dom, "aliases": al})
    for code, name, state, lat, lng, _r in TOWNS:
        t["indian_locations"]["districts_cities"].append({"id": f"LOC-CITY-{code}", "name": name, "state": state, "aliases": []})
    return t, skill_id


def role_profiles(v1_internships, skill_id):
    """Per existing role: skill pools and sector mix learned from v1; plus the NEW_ROLES specs."""
    mand, pref, sect, degs = defaultdict(Counter), defaultdict(Counter), defaultdict(Counter), defaultdict(Counter)
    for i in v1_internships:
        r = i["role_id"]
        mand[r].update(i["mandatory_skills"]); pref[r].update(i["preferred_skills"]); sect[r][i["sector_id"]] += 1
        e = i["education_requirements"]
        degs[(r, e["education_level"])][(e.get("degree"), e.get("field_of_study"))] += 1
    prof = {}
    for r in mand:
        sec = dict(sect[r])
        if r in OILGAS_EXTRA:
            sec["SEC-026"] = OILGAS_EXTRA[r] * max(1, sum(sec.values()) // 10)
        prof[r] = {"mand": [k for k, _ in mand[r].most_common(6)], "pref": [k for k, _ in pref[r].most_common(14)], "sectors": sec, "new": False}
    for rid, name, dom, sec, edu, m, p, al in NEW_ROLES:
        prof[rid] = {"mand": [skill_id[x] for x in m], "pref": [skill_id[x] for x in p], "sectors": sec, "edu": edu, "new": True}
    return prof, degs


def edu_weights(rid, has_new):
    if has_new:
        return None
    if rid in LOW_EDU_ROLES:
        w = {"EDU-10": 15, "EDU-12": 30, "EDU-UG": 20}
        if rid in ITI_OK:
            w["EDU-ITI"] = 15
        if rid in DIP_OK:
            w["EDU-DIPLOMA"] = 20
        return w
    return {"EDU-UG": 60, "EDU-PG": 25, "EDU-DIPLOMA": 15}


def make_internships(n, rng, prof, degs, boost=None):
    new_ids = [r for r in prof if prof[r]["new"]]
    low_ids = [r for r in prof if not prof[r]["new"] and r in LOW_EDU_ROLES]
    high_ids = [r for r in prof if not prof[r]["new"] and r not in LOW_EDU_ROLES]
    groups = ([(new_ids, 0.42), (low_ids, 0.36), (high_ids, 0.22)])
    weights_new = {r: (1.2 if r in ("ROLE-066", "ROLE-067", "ROLE-068", "ROLE-069") else 1.0) for r in new_ids}
    # roles whose sectors are in demand (boost > 1) are picked more often, so thin sectors can reach the minimum
    rolef = {r: sum(w * (boost or {}).get(sec, 1.0) for sec, w in prof[r]["sectors"].items()) / max(1e-9, sum(prof[r]["sectors"].values())) for r in prof}
    out = []
    for k in range(1, n + 1):
        pool, = rng.choices([g[0] for g in groups], weights=[g[1] for g in groups])
        rid = rng.choices(pool, weights=[weights_new.get(r, 1.0) * rolef[r] for r in pool])[0]
        p = prof[rid]
        sid = wchoice(rng, {k: v * (boost or {}).get(k, 1.0) for k, v in p["sectors"].items()})
        edu = wchoice(rng, p["edu"] if p["new"] else edu_weights(rid, False))
        degree = field = None
        if edu == "EDU-ITI":
            degree = "DEG-ITI-CERT"
        elif edu in ("EDU-UG", "EDU-PG", "EDU-DIPLOMA") and not p["new"]:
            c = degs.get((rid, edu))
            if c:
                degree, field = rng.choice(list(c.elements()))
        elif edu == "EDU-DIPLOMA":
            degree = "DEG-DIPLOMA-ENGG"
        m_n = 1 if rng.random() < 0.6 else 2
        mand = rng.sample(p["mand"][:max(m_n, min(len(p["mand"]), 4))], min(m_n, len(p["mand"])))
        rest = [s for s in dict.fromkeys(p["pref"] + p["mand"]) if s not in mand]
        pref = rng.sample(rest, min(len(rest), rng.randint(2, 5)))
        # location: Oil & Gas near its hubs, others lean to small towns
        if sid == "SEC-026":
            loc = rng.choice(OILGAS_TOWNS)
        elif rng.random() < 0.5:
            loc = rng.choice(SMALL)
        else:
            loc = None  # a bigger city, chosen in finish_internships()
        out.append((k, rid, sid, edu, degree, field, mand, pref, loc))
    return out


SECTOR_MIN, SECTOR_MAX = 50, 200      # #41: every sector gets 50-200 listings (at 2,500 listings)


def balance_boost(n, seed, prof, degs, sectors):
    """Find per-sector weights so that no sector has fewer than SECTOR_MIN or more than SECTOR_MAX listings."""
    boost = {s: 1.0 for s in sectors}
    lo, hi = SECTOR_MIN * n / 2500, SECTOR_MAX * n / 2500
    for _ in range(40):
        rows = make_internships(n, random.Random(seed), prof, degs, boost)
        cnt = {s: 0 for s in sectors}
        for r in rows:
            cnt[r[2]] += 1
        if all(lo * 1.3 <= c <= hi * 0.8 for c in cnt.values()):
            break
        for s_, c in cnt.items():
            target = lo * 1.8 if c < lo * 1.3 else hi * 0.7 if c > hi * 0.8 else None
            if target:
                boost[s_] = min(50.0, max(0.02, boost[s_] * (target / max(c, 3)) ** 0.8))
    return boost


def finish_internships(rows, rng, role_name, sector_name, big_cities, rules):
    stipend = rules["stipend_inr_per_month"]
    res, used = [], set()
    for k, rid, sid, edu, degree, field, mand, pref, loc in rows:
        if loc is None:
            loc = rng.choice(big_cities)
        small = loc in SMALL
        fac = [OTHER_FAC[0]]
        if rng.random() < (0.55 if small else 0.45):
            fac.append(FOOD)
        if rng.random() < (0.45 if (small or edu in ("EDU-ITI", "EDU-10")) else 0.25):
            fac.append(STAY)
        if rng.random() < 0.5:
            fac.append(rng.choice([TRANSPORT, TRANSPORT2]))
        fac += rng.sample(OTHER_FAC[1:], rng.randint(0, 2))
        title = role_name[rid] + rng.choice(VARIANTS)
        while True:  # no two listings with the same company, title and place
            company = f"{rng.choice(FIRST)} {rng.choice(SECOND.get(sid, DEFAULT_SECOND))} {rng.choice(SUFFIX)}"
            if (company, title, loc) not in used:
                used.add((company, title, loc))
                break
        res.append({
            "internship_id": f"ISU2-{k:06d}", "company_name": company, "title": title, "sector_id": sid, "role_id": rid,
            "description": (f"Work with the {sector_name[sid]} team as a {role_name[rid]}. You learn on the job, with a supervisor to guide you. "
                            f"Typical tasks: helping with daily work, keeping simple records and following safety and quality rules."),
            "education_requirements": {"education_level": edu, "degree": degree, "field_of_study": field,
                                       "notes": "Or an equivalent qualification recognised by the host organisation."},
            "mandatory_skills": mand, "preferred_skills": pref, "location": loc,
            "duration": rng.choice(["6 months", "9 months"]),
            "stipend": {"amount_inr_per_month": stipend, "currency": "INR", "is_synthetic": True,
                        "note": "Fixed PMIS-style stipend taken from data/pmis_rules.json. Synthetic listing; not a real vacancy or payment."},
            "facilities": fac, "application_url": None, "data_source": "synthetic", "generation_method": "script (build_dataset_v2)",
            "dataset_version": "v2.0", "pmis_alignment": True})
    return res


# ---------------------------------------------------------------- candidates
# archetype: weight, education mix, skill names pool (core first), number of skills, small-town share
ARCH = {
    "rural_school": (0.24, {"EDU-10": 45, "EDU-12": 55}, ["Crop Farming", "Livestock & Dairy Care", "Shop Counter & Billing", "Tailoring & Stitching", "Light Vehicle Driving",
                     "Mobile Phone & UPI Use", "Cooking & Food Preparation", "Loading, Packing & Stock Handling", "Cash Handling & Basic Accounts", "Tractor & Pump Operation",
                     "Handloom & Handicraft", "Carpentry", "Hindi Proficiency", "Teamwork", "Work Ethic"], (1, 4), 0.8),
    "iti_trade": (0.13, {"EDU-ITI": 100}, ["Electrical Wiring", "Machine Maintenance", "Plumbing & Pipe Fitting", "Household Electrical Repair", "Workplace Safety & PPE",
                  "Pump & Valve Maintenance", "Mobile Phone Repair", "Carpentry", "Quality Control", "Construction Safety", "Teamwork", "Hindi Proficiency"], (2, 5), 0.55),
    "diploma": (0.13, {"EDU-DIPLOMA": 100}, ["Machine Maintenance", "Electrical Wiring", "Quality Control", "Instrumentation Basics", "Workplace Safety & PPE", "Production Planning",
                 "Surveying", "Construction Safety", "Pump & Valve Maintenance", "Microsoft Excel (Basic)", "Teamwork", "Problem Solving"], (3, 6), 0.4),
    "basic_graduate": (0.16, {"EDU-12": 35, "EDU-UG": 65}, ["Retail Sales", "Customer Support", "Basic Data Entry & Typing", "Typing Speed & Accuracy", "Microsoft Excel (Basic)",
                       "Mobile Phone & UPI Use", "Banking Operations", "Verbal Communication", "Hindi Proficiency", "English Proficiency", "Teamwork", "Community Outreach & Local Language"], (2, 5), 0.5),
    "graduate": (0.20, {"EDU-UG": 90, "EDU-PG": 10}, ["Python", "Microsoft Excel (Basic)", "Written Communication", "Verbal Communication", "Financial Accounting", "Bookkeeping", "Digital Marketing",
                  "Social Media Marketing", "Teamwork", "Problem Solving", "English Proficiency", "Presentation Skills", "Customer Support"], (3, 7), 0.25),
    "postgraduate": (0.07, {"EDU-PG": 100}, ["Python", "Data Analysis", "Report Writing", "Research Methodology", "Financial Analysis", "Presentation Skills", "English Proficiency",
                     "Problem Solving", "Written Communication"], (4, 8), 0.1),
    "sparse": (0.07, {"EDU-10": 30, "EDU-12": 50, "EDU-UG": 20}, ["Hindi Proficiency", "Teamwork", "Mobile Phone & UPI Use"], (0, 1), 0.7),
}
HINGLISH = {"Crop Farming": "kheti", "Livestock & Dairy Care": "pashupalan", "Shop Counter & Billing": "dukaan ka hisaab", "Tailoring & Stitching": "silai",
            "Light Vehicle Driving": "gaadi chalana", "Cooking & Food Preparation": "khana banana", "Carpentry": "badhai", "Mobile Phone & UPI Use": "upi",
            "Tractor & Pump Operation": "tractor chalana", "Household Electrical Repair": "bijli ka kaam", "Cash Handling & Basic Accounts": "hisaab kitaab"}
ROLE_FOR_SKILL = {"Crop Farming": "ROLE-060", "Livestock & Dairy Care": "ROLE-061", "Shop Counter & Billing": "ROLE-063", "Tailoring & Stitching": "ROLE-064",
                  "Light Vehicle Driving": "ROLE-071", "Cooking & Food Preparation": "ROLE-072", "Electrical Wiring": "ROLE-080", "Machine Maintenance": "ROLE-062",
                  "Plumbing & Pipe Fitting": "ROLE-081", "Carpentry": "ROLE-082", "Workplace Safety & PPE": "ROLE-066", "Pump & Valve Maintenance": "ROLE-069",
                  "Loading, Packing & Stock Handling": "ROLE-070", "Basic Data Entry & Typing": "ROLE-073", "Retail Sales": "ROLE-063", "Customer Support": "ROLE-038"}


def make_candidates(n, rng, tax, skill_id, big_cities, roles_by_edu, extra_pool=None):
    names = list(skill_id)
    sectors = [s["id"] for s in tax["sectors"]]
    arch_names = list(ARCH)
    out = []
    for k in range(1, n + 1):
        a = rng.choices(arch_names, weights=[ARCH[x][0] for x in arch_names])[0]
        _w, edu_mix, pool, (lo, hi), small_share = ARCH[a]
        edu = wchoice(rng, edu_mix)
        want = rng.randint(lo, hi)
        valid = [s for s in pool if s in skill_id]
        skills = rng.sample(valid, min(want, len(valid))) if valid else []
        if extra_pool and a != "sparse" and rng.random() < 0.7:      # #41: wider skill coverage; extras come from listings at this education level
            more = [x for x in extra_pool.get(edu, []) if x not in {skill_id[q] for q in skills}]
            skills += [next(k for k, v in skill_id.items() if v == x) for x in rng.sample(more, min(len(more), rng.randint(1, 3)))]
        degree = field = None
        if edu == "EDU-ITI":
            degree, field = "DEG-ITI-CERT", None
        elif edu == "EDU-DIPLOMA":
            degree, field = "DEG-DIPLOMA-ENGG", rng.choice(["FOS-MECH", "FOS-EEE", "FOS-CIVIL", "FOS-ECE", "FOS-IT"])
        elif edu == "EDU-UG":
            degree = rng.choice(["DEG-BA", "DEG-BCOM", "DEG-BSC", "DEG-BBA", "DEG-BCA", "DEG-BTECH", "DEG-BVOC"])
            field = rng.choice(["FOS-COMMERCE", "FOS-HUMANITIES", "FOS-MGMT", "FOS-IT", "FOS-CSE", "FOS-AGRI", "FOS-VOCATIONAL", "FOS-MATH"])
        elif edu == "EDU-PG":
            degree = rng.choice(["DEG-MA", "DEG-MSC", "DEG-MCOM", "DEG-MCA"])
            field = rng.choice(["FOS-COMMERCE", "FOS-MATH", "FOS-ECONOMICS", "FOS-CSE", "FOS-HUMANITIES"])
        home = rng.choice(SMALL) if rng.random() < small_share else rng.choice(big_cities)
        remote = home in REMOTE
        pref_locs = list(dict.fromkeys([home] + [rng.choice(SMALL + big_cities) for _ in range(rng.randint(0, 2))]))
        roles = [ROLE_FOR_SKILL[s] for s in skills if s in ROLE_FOR_SKILL]
        if not roles:
            roles = [rng.choice(roles_by_edu[edu])]
        roles = list(dict.fromkeys(roles))[:2]
        sec_pool = ["SEC-006", "SEC-007", "SEC-016", "SEC-009", "SEC-003", "SEC-012", "SEC-026", "SEC-008", "SEC-002"] if a in ("rural_school", "iti_trade", "sparse") else sectors
        eng = rng.choices(["none", "basic", "intermediate", "fluent"], weights={"rural_school": [30, 50, 18, 2], "iti_trade": [15, 55, 28, 2], "sparse": [35, 45, 18, 2]}.get(a, [3, 22, 50, 25]))[0]
        langs = list(dict.fromkeys(["SK-LANG-001"] + (["SK-LANG-003"] if rng.random() < 0.5 else []) + (["SK-LANG-002"] if eng in ("intermediate", "fluent") else [])))
        raw = [HINGLISH[s] for s in skills if s in HINGLISH and rng.random() < 0.6] if a in ("rural_school", "sparse", "iti_trade") else []
        c = {
            "candidate_id": f"CAND2-{k:06d}",
            "education": {"education_level": edu, "degree": degree, "field_of_study": field, "year_of_completion": rng.randint(2019, 2026), "notes": "Synthetic educational record."},
            "skills": [skill_id[s] for s in skills], "interests": [],   # retired in the app; key kept because the dataset format has it
            "preferred_roles": roles,
            "location_preferences": {"home_location": home, "willing_to_travel": rng.random() < 0.5, "willing_to_relocate": rng.random() < (0.55 if remote else 0.35), "preferred_locations": pref_locs},
            "preferences": {"preferred_sectors": rng.sample(sec_pool, rng.randint(1, 3)), "duration_preference": rng.choice(["6 months", "9 months"]),
                            "stipend_expectation": {"amount_inr_per_month": 9000, "currency": "INR", "is_synthetic": True, "note": "PMIS fixed stipend; not used for scoring."},
                            "work_mode_preference": "onsite", "role_preference_strength": rng.choice(["weak", "moderate", "strong"])},
            "experience": {"has_prior_internship": False, "internship_count": 0, "project_count": rng.randint(0, 2) if a in ("graduate", "postgraduate") else 0,
                           "has_project_experience": a in ("graduate", "postgraduate") and rng.random() < 0.5,
                           "overall_skill_level": "beginner" if a in ("sparse", "rural_school", "basic_graduate") else rng.choice(["beginner", "intermediate"]),
                           "notes": "Synthetic experience summary."},
            "language_metadata": {"languages_known": langs, "english_proficiency": eng, "notes": "Self-reported synthetic language proficiency."},
            "context_flags": {"archetype": a, "remote_district": remote, "first_generation": rng.random() < (0.6 if a in ("rural_school", "iti_trade", "sparse") else 0.25),
                              "low_english": eng in ("none", "basic"), "NOTE": "For fairness evaluation only. Never used for scoring."},
            "raw_inputs": {"skills_text": raw} if raw else {},
            "data_source": "synthetic", "generation_method": "script (build_dataset_v2)", "dataset_version": "v2.0"}
        c["experience"]["has_project_experience"] = bool(c["experience"]["has_project_experience"])
        out.append(c)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--internships", type=int, default=2500)
    ap.add_argument("--candidates", type=int, default=700)
    ap.add_argument("--seed", type=int, default=42)
    a = ap.parse_args()
    rng = random.Random(a.seed)
    v1_tax = json.loads((DATA / "internsetu_taxonomy.json").read_text(encoding="utf-8"))
    v1_int = json.loads((DATA / "internsetu_synthetic_internships_v1.json").read_text(encoding="utf-8"))["internships"]
    rules = json.loads((DATA / "pmis_rules.json").read_text(encoding="utf-8"))
    tax, skill_id = build_taxonomy(v1_tax)
    prof, degs = role_profiles(v1_int, skill_id)
    role_name = {r["id"]: r["name"] for r in tax["roles"]}
    sector_name = {s["id"]: s["name"] for s in tax["sectors"]}
    big = [c["id"] for c in v1_tax["indian_locations"]["districts_cities"]]
    boost = balance_boost(a.internships, a.seed, prof, degs, [x["id"] for x in tax["sectors"]])
    rows = make_internships(a.internships, rng, prof, degs, boost)
    internships = finish_internships(rows, rng, role_name, sector_name, big, rules)
    roles_by_edu = {"EDU-10": ["ROLE-063", "ROLE-070", "ROLE-060"], "EDU-12": ["ROLE-063", "ROLE-073", "ROLE-038"], "EDU-ITI": ["ROLE-080", "ROLE-062"],
                    "EDU-DIPLOMA": ["ROLE-005", "ROLE-016"], "EDU-UG": ["ROLE-038", "ROLE-073", "ROLE-021"], "EDU-PG": ["ROLE-058", "ROLE-008"]}
    extra = {}
    for i in internships:
        extra.setdefault(i["education_requirements"]["education_level"], set()).update(i["mandatory_skills"])
    extra_pool = {k: sorted(v) for k, v in extra.items()}
    cands = make_candidates(a.candidates, rng, tax, skill_id, big, roles_by_edu, extra_pool)

    OUT.mkdir(exist_ok=True)
    meta = {"dataset_version": "v2.0", "data_source": "synthetic", "generation_method": "script (build_dataset_v2)", "seed": a.seed,
            "disclaimer": "Synthetic research records. Not real PMIS listings or people. Company names are invented. Stipend is the fixed value in pmis_rules.json."}
    (OUT / "internsetu_taxonomy_v2.json").write_text(json.dumps(tax, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "internsetu_internships_v2.json").write_text(json.dumps({"dataset_meta": {**meta, "name": "InternSetu Synthetic Internships v2", "record_count": len(internships)}, "internships": internships}, ensure_ascii=False, indent=1), encoding="utf-8")
    (OUT / "internsetu_candidates_v2.json").write_text(json.dumps({"dataset_meta": {**meta, "name": "InternSetu Synthetic Candidates v2", "record_count": len(cands)}, "candidates": cands}, ensure_ascii=False, indent=1), encoding="utf-8")
    with open(DATA / "locations_coordinates.csv", encoding="utf-8-sig", newline="") as f:
        old = list(csv.reader(f))
    with open(OUT / "locations_coordinates_v2.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f)
        w.writerows(old)
        for code, name, _st, lat, lng, _r in TOWNS:
            w.writerow([f"LOC-CITY-{code}", name, lat, lng])
    print(f"wrote {len(internships)} internships, {len(cands)} candidates, {len(tax['skills'])} skills, {len(tax['roles'])} roles to {OUT}")


if __name__ == "__main__":
    main()
