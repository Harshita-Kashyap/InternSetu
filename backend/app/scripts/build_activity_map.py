"""Build data/activity_skill_map.json (tracker #10): everyday activities -> taxonomy skills, with en/hi/mr labels and an icon.

    python -m app.scripts.build_activity_map
Skills are written by NAME below and resolved to ids against the v2 taxonomy, so a typo fails here instead of in the app.
"""
import json
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data"
A = [  # (icon, en, hi, mr, [skill names])
    ("🌾", "Worked on a farm", "खेत में काम किया", "शेतात काम केले", ["Crop Farming", "Crop Management"]),
    ("🐄", "Looked after cattle or milk work", "पशुओं या दूध का काम किया", "जनावरांची किंवा दुधाची कामे केली", ["Livestock & Dairy Care", "Animal Husbandry"]),
    ("🚜", "Drove a tractor or ran a water pump", "ट्रैक्टर या पानी का पंप चलाया", "ट्रॅक्टर किंवा पाण्याचा पंप चालवला", ["Tractor & Pump Operation"]),
    ("🏪", "Helped in a shop", "दुकान पर काम किया", "दुकानात मदत केली", ["Shop Counter & Billing", "Retail Sales", "Cash Handling & Basic Accounts"]),
    ("🧵", "Stitched clothes", "कपड़े सिले", "कपडे शिवले", ["Tailoring & Stitching"]),
    ("🧶", "Weaving or handicraft", "बुनाई या हस्तशिल्प", "विणकाम किंवा हस्तकला", ["Handloom & Handicraft"]),
    ("🚗", "Drove a car, auto or bike for work", "काम के लिए गाड़ी या बाइक चलाई", "कामासाठी गाडी किंवा बाइक चालवली", ["Light Vehicle Driving"]),
    ("📱", "Used UPI and mobile payments", "UPI और मोबाइल पेमेंट इस्तेमाल किया", "UPI आणि मोबाइल पेमेंट वापरले", ["Mobile Phone & UPI Use"]),
    ("🍳", "Cooked for many people", "कई लोगों के लिए खाना बनाया", "अनेक लोकांसाठी स्वयंपाक केला", ["Cooking & Food Preparation"]),
    ("💡", "Fixed electrical wiring", "बिजली की वायरिंग ठीक की", "विजेची वायरिंग दुरुस्त केली", ["Household Electrical Repair", "Electrical Wiring"]),
    ("🚰", "Fixed taps or pipes", "नल या पाइप ठीक किए", "नळ किंवा पाइप दुरुस्त केले", ["Plumbing & Pipe Fitting"]),
    ("🪚", "Did wood work", "लकड़ी का काम किया", "लाकडाचे काम केले", ["Carpentry"]),
    ("📦", "Loaded, packed or moved goods", "सामान चढ़ाया, पैक किया या पहुँचाया", "माल चढवला, पॅक केला किंवा पोहोचवला", ["Loading, Packing & Stock Handling"]),
    ("📒", "Kept accounts or counted cash", "हिसाब रखा या नकद गिना", "हिशोब ठेवला किंवा रोख मोजली", ["Cash Handling & Basic Accounts", "Bookkeeping"]),
    ("⌨️", "Typed or entered data on a computer", "कंप्यूटर पर टाइपिंग या डेटा एंट्री की", "संगणकावर टायपिंग किंवा डेटा एंट्री केली", ["Basic Data Entry & Typing", "Typing Speed & Accuracy"]),
    ("🔧", "Repaired mobile phones", "मोबाइल फोन ठीक किए", "मोबाइल फोन दुरुस्त केले", ["Mobile Phone Repair"]),
    ("🛠️", "Repaired machines", "मशीनें ठीक कीं", "यंत्रे दुरुस्त केली", ["Machine Maintenance"]),
    ("🏘️", "Worked with people in my village", "गाँव में लोगों के साथ काम किया", "गावात लोकांसोबत काम केले", ["Community Outreach & Local Language", "Government Scheme Awareness"]),
    ("🩹", "Gave first aid or cared for the sick", "प्राथमिक उपचार दिया या बीमारों की देखभाल की", "प्रथमोपचार दिला किंवा आजारी लोकांची काळजी घेतली", ["First Aid", "Patient Care"]),
    ("🧑‍💼", "Talked to customers", "ग्राहकों से बात की", "ग्राहकांशी बोललो", ["Customer Support", "Verbal Communication"]),
    ("⛽", "Worked at a petrol pump", "पेट्रोल पंप पर काम किया", "पेट्रोल पंपावर काम केले", ["Fuel Dispensing & Station Operations", "Workplace Safety & PPE"]),
    ("🔥", "Delivered gas cylinders", "गैस सिलेंडर पहुँचाए", "गॅस सिलिंडर पोहोचवले", ["LPG Cylinder Handling"]),
    ("🦺", "Worked on a site with safety gear", "सुरक्षा उपकरणों के साथ साइट पर काम किया", "सुरक्षा साधनांसह साइटवर काम केले", ["Workplace Safety & PPE", "Hazard Identification", "Construction Safety"]),
    ("☀️", "Installed solar or electrical equipment", "सोलर या बिजली के उपकरण लगाए", "सोलर किंवा विद्युत उपकरणे बसवली", ["Electrical Wiring", "Renewable Energy Systems"]),
    ("💻", "Built a website or app", "वेबसाइट या ऐप बनाया", "वेबसाइट किंवा अ‍ॅप बनवले", ["Python", "JavaScript", "SQL", "Node.js", "Express.js", "Vue.js", "Bootstrap", "Full Stack Web Development"]),
    ("📊", "Used Excel or Google Sheets", "Excel या Google Sheets इस्तेमाल किया", "Excel किंवा Google Sheets वापरले", ["Microsoft Excel (Basic)"]),
    ("🗣️", "Spoke Hindi or a local language at work", "काम पर हिंदी या स्थानीय भाषा बोली", "कामावर हिंदी किंवा स्थानिक भाषा बोललो", ["Hindi Proficiency", "Regional Language Proficiency"]),
    ("🧹", "Cleaned and looked after guest rooms", "मेहमानों के कमरे साफ़ किए और संभाले", "पाहुण्यांच्या खोल्या स्वच्छ केल्या व सांभाळल्या", ["Housekeeping Management"]),
    ("✍️", "Wrote letters or reports", "पत्र या रिपोर्ट लिखी", "पत्रे किंवा अहवाल लिहिला", ["Written Communication", "Report Writing"]),
    # --- session 8 (#41): wider coverage, plain words, one everyday sentence per activity ---
    ("🏭", "Worked in a factory or workshop", "फैक्ट्री या वर्कशॉप में काम किया", "कारखान्यात किंवा वर्कशॉपमध्ये काम केले", ["Manufacturing Processes", "CNC Operation", "Quality Control"]),
    ("🔩", "Checked pumps, valves or pipes", "पंप, वाल्व या पाइप जाँचे", "पंप, व्हॉल्व्ह किंवा पाइप तपासले", ["Pump & Valve Maintenance", "Pipeline Inspection Basics", "Instrumentation Basics"]),
    ("🏗️", "Supervised or measured building work", "निर्माण कार्य की निगरानी या नाप-जोख की", "बांधकामाची देखरेख किंवा मोजमाप केले", ["Site Supervision", "Quantity Surveying", "Construction Management"]),
    ("📐", "Drew plans or designs", "नक्शे या डिज़ाइन बनाए", "आराखडे किंवा डिझाइन काढले", ["CAD Modelling", "Civil Engineering Drafting", "SolidWorks", "Mechanical Design", "Interior Design", "AutoCAD"]),
    ("🏬", "Managed stock in a store or godown", "दुकान या गोदाम में स्टॉक संभाला", "दुकान किंवा गोदामातील माल सांभाळला", ["Inventory Management", "Warehouse Management", "Procurement"]),
    ("🚚", "Planned deliveries or managed vehicles", "डिलीवरी की योजना बनाई या गाड़ियाँ संभालीं", "डिलिव्हरीचे नियोजन केले किंवा वाहने सांभाळली", ["Logistics Coordination", "Fleet Management", "Supply Chain Management", "Import-Export Documentation"]),
    ("🌱", "Grew vegetables, fruit or plants", "सब्ज़ी, फल या पौधे उगाए", "भाजीपाला, फळे किंवा रोपे वाढवली", ["Horticulture", "Farm Management", "Soil Testing"]),
    ("🧑‍🌾", "Helped farmers with advice or schemes", "किसानों को सलाह या योजनाओं में मदद की", "शेतकऱ्यांना सल्ला किंवा योजनांमध्ये मदत केली", ["Agricultural Extension", "Agri-Business Management", "Rural Development Practices"]),
    ("💧", "Looked after water, waste or cleanliness work", "पानी, कचरे या सफ़ाई का काम संभाला", "पाणी, कचरा किंवा स्वच्छतेचे काम पाहिले", ["Water Resource Management", "Waste Management", "Public Health Awareness"]),
    ("🏛️", "Worked in a panchayat or government office", "पंचायत या सरकारी दफ़्तर में काम किया", "पंचायत किंवा सरकारी कार्यालयात काम केले", ["Panchayati Raj Administration", "e-Governance Tools", "Public Policy Analysis"]),
    ("🏨", "Worked at a hotel front desk or restaurant", "होटल रिसेप्शन या रेस्तरां में काम किया", "हॉटेल रिसेप्शन किंवा रेस्टॉरंटमध्ये काम केले", ["Hotel Front Office Operations", "Food & Beverage Service"]),
    ("🧳", "Planned trips or tours", "यात्राओं या टूर की योजना बनाई", "सहली किंवा टूरचे नियोजन केले", ["Travel Itinerary Planning", "Tour Planning", "Event Management"]),
    ("💊", "Worked at a medical shop or clinic", "मेडिकल दुकान या क्लिनिक में काम किया", "मेडिकल दुकान किंवा क्लिनिकमध्ये काम केले", ["Pharmacy Operations", "Clinical Assistance", "Medical Terminology", "Health Record Management", "Laboratory Technician Skills", "Healthcare Administration"]),
    ("🏫", "Taught or tutored students", "विद्यार्थियों को पढ़ाया या ट्यूशन दी", "विद्यार्थ्यांना शिकवले किंवा शिकवणी घेतली", ["Teaching Methodology", "Curriculum Development", "Instructional Design", "E-Learning Content Development"]),
    ("🏦", "Worked at a bank or with loans and insurance", "बैंक में या लोन व बीमा का काम किया", "बँकेत किंवा कर्ज व विम्याचे काम केले", ["Banking Operations", "Taxation Basics", "GST Compliance"]),
    ("🧮", "Did accounts on Tally or filed GST", "Tally पर हिसाब किया या GST भरा", "Tally वर हिशोब केला किंवा GST भरला", ["Tally ERP", "Financial Accounting", "Payroll Processing", "Budgeting", "Financial Modelling", "Payroll Management"]),
    ("📞", "Answered calls or complaints", "कॉल या शिकायतें सुनीं", "कॉल किंवा तक्रारी हाताळल्या", ["Call Centre Operations", "Complaint Handling", "Helpdesk Support"]),
    ("🤝", "Sold products or found new customers", "सामान बेचा या नए ग्राहक खोजे", "माल विकला किंवा नवे ग्राहक शोधले", ["Sales Techniques", "Lead Generation", "Cold Calling", "B2B Sales", "Sales Negotiation"]),
    ("📣", "Promoted a business on social media", "सोशल मीडिया पर व्यापार का प्रचार किया", "सोशल मीडियावर व्यवसायाचा प्रचार केला", ["Influencer Marketing", "Content Marketing", "Email Marketing", "Search Engine Marketing", "Advertising", "Brand Management", "Google Analytics"]),
    ("🎨", "Made posters or graphic designs", "पोस्टर या ग्राफ़िक डिज़ाइन बनाए", "पोस्टर किंवा ग्राफिक डिझाइन बनवले", ["Graphic Design", "Canva", "Adobe Photoshop", "Adobe Illustrator", "Figma", "Adobe XD"]),
    ("🎬", "Edited videos or photos", "वीडियो या फ़ोटो एडिट किए", "व्हिडिओ किंवा फोटो एडिट केले", ["Video Editing", "Photography", "Motion Graphics", "Podcast Production"]),
    ("📰", "Wrote articles, posts or scripts", "लेख, पोस्ट या स्क्रिप्ट लिखे", "लेख, पोस्ट किंवा स्क्रिप्ट लिहिले", ["Content Writing", "Copywriting", "Blogging", "Journalism", "Scriptwriting", "Technical Writing", "Proofreading"]),
    ("🌐", "Translated between languages", "भाषाओं के बीच अनुवाद किया", "भाषांतर केले", ["Translation Skills"]),
    ("🔍", "Collected information or ran a survey", "जानकारी जुटाई या सर्वे किया", "माहिती गोळा केली किंवा सर्वेक्षण केले", ["Market Research", "Survey Design", "Qualitative Analysis", "Research Methodology", "Literature Review"]),
    ("📈", "Studied numbers and made charts", "आँकड़ों का अध्ययन किया और चार्ट बनाए", "आकडेवारीचा अभ्यास करून चार्ट बनवले", ["Data Analysis", "Data Visualization", "Statistical Analysis", "Data Interpretation", "Marketing Analytics", "Sales Forecasting"]),
    ("👥", "Helped with hiring or staff records", "भर्ती या कर्मचारियों के रिकॉर्ड में मदद की", "भरती किंवा कर्मचाऱ्यांच्या नोंदींमध्ये मदत केली", ["HR Policies", "Employee Onboarding", "Employee Engagement", "HRIS Systems", "Performance Management", "Training & Development"]),
    ("⚖️", "Helped with legal papers or rules", "कानूनी कागज़ों या नियमों में मदद की", "कायदेशीर कागदपत्रे किंवा नियमांमध्ये मदत केली", ["Legal Research", "Legal Documentation", "Contract Drafting", "Compliance Management", "Intellectual Property Basics", "Cyber Law Awareness"]),
    ("🛡️", "Checked risks or followed company rules", "जोखिम जाँचे या कंपनी के नियम निभाए", "जोखीम तपासली किंवा कंपनीचे नियम पाळले", ["Risk Assessment", "Six Sigma", "Sustainability Reporting", "Climate Risk Analysis", "Incident Response"]),
    ("🖥️", "Set up or fixed computers and networks", "कंप्यूटर या नेटवर्क लगाए या ठीक किए", "संगणक किंवा नेटवर्क बसवले किंवा दुरुस्त केले", ["Linux Administration", "Shell Scripting", "Network Security", "Cloud Computing Fundamentals", "Vulnerability Assessment", "Microsoft Azure"]),
    ("🧑‍💻", "Wrote computer programs", "कंप्यूटर प्रोग्राम लिखे", "संगणक प्रोग्राम लिहिले", ["Java", "C#", "PHP", "TypeScript", "Kotlin", "Git Version Control", "REST API Development", "Django", "React.js", "WordPress", "C Programming", "Swift"]),
    ("🤖", "Worked with data, AI or machine learning", "डेटा, AI या मशीन लर्निंग पर काम किया", "डेटा, AI किंवा मशीन लर्निंगवर काम केले", ["Machine Learning", "Deep Learning", "Neural Networks", "Natural Language Processing", "R Programming", "Data Mining", "MATLAB", "NumPy", "ETL Processes", "Computer Vision", "TensorFlow", "PyTorch", "Generative AI", "Prompt Engineering"]),
    ("🔌", "Built electronics or sensor projects", "इलेक्ट्रॉनिक्स या सेंसर प्रोजेक्ट बनाए", "इलेक्ट्रॉनिक्स किंवा सेन्सर प्रकल्प बनवले", ["Embedded Systems", "Microcontroller Programming", "IoT Development", "VLSI Design", "Signal Processing", "Power Systems", "Industrial Automation"]),
]


BN = [
    "খামারে কাজ করেছি",
    "গবাদি পশুর যত্ন বা দুধের কাজ করেছি",
    "ট্রাক্টর চালিয়েছি বা পানির পাম্প চালিয়েছি",
    "দোকানে সাহায্য করেছি",
    "জামাকাপড় সেলাই করেছি",
    "তাঁত বা হস্তশিল্পের কাজ করেছি",
    "কাজের জন্য গাড়ি, অটো বা বাইক চালিয়েছি",
    "UPI ও মোবাইল পেমেন্ট ব্যবহার করেছি",
    "অনেক মানুষের জন্য রান্না করেছি",
    "বৈদ্যুতিক তার সারিয়েছি",
    "কল বা পাইপ সারিয়েছি",
    "কাঠের কাজ করেছি",
    "মাল তুলেছি, প্যাক করেছি বা সরিয়েছি",
    "হিসাব রেখেছি বা নগদ টাকা গুনেছি",
    "কম্পিউটারে টাইপ করেছি বা তথ্য ঢুকিয়েছি",
    "মোবাইল ফোন সারিয়েছি",
    "যন্ত্র সারিয়েছি",
    "আমার গ্রামের মানুষের সঙ্গে কাজ করেছি",
    "প্রাথমিক চিকিৎসা দিয়েছি বা অসুস্থদের যত্ন নিয়েছি",
    "গ্রাহকদের সঙ্গে কথা বলেছি",
    "পেট্রল পাম্পে কাজ করেছি",
    "গ্যাস সিলিন্ডার পৌঁছে দিয়েছি",
    "নিরাপত্তা সরঞ্জাম পরে সাইটে কাজ করেছি",
    "সোলার বা বৈদ্যুতিক সরঞ্জাম বসিয়েছি",
    "ওয়েবসাইট বা অ্যাপ বানিয়েছি",
    "Excel বা Google Sheets ব্যবহার করেছি",
    "কাজে হিন্দি বা স্থানীয় ভাষায় কথা বলেছি",
    "অতিথিদের ঘর পরিষ্কার ও গুছিয়ে রেখেছি",
    "চিঠি বা প্রতিবেদন লিখেছি",
    "কারখানা বা ওয়ার্কশপে কাজ করেছি",
    "পাম্প, ভালভ বা পাইপ পরীক্ষা করেছি",
    "নির্মাণকাজ তদারকি বা মাপজোক করেছি",
    "নকশা বা ডিজাইন এঁকেছি",
    "দোকান বা গুদামে মজুত মাল সামলেছি",
    "ডেলিভারির পরিকল্পনা করেছি বা গাড়ি সামলেছি",
    "সবজি, ফল বা গাছ ফলিয়েছি",
    "কৃষকদের পরামর্শ বা সরকারি প্রকল্পে সাহায্য করেছি",
    "পানি, বর্জ্য বা পরিচ্ছন্নতার কাজ দেখেছি",
    "পঞ্চায়েত বা সরকারি অফিসে কাজ করেছি",
    "হোটেলের রিসেপশনে বা রেস্তোরাঁয় কাজ করেছি",
    "ভ্রমণ বা ট্যুরের পরিকল্পনা করেছি",
    "ওষুধের দোকান বা ক্লিনিকে কাজ করেছি",
    "শিক্ষার্থীদের পড়িয়েছি বা প্রাইভেট টিউশন দিয়েছি",
    "ব্যাংকে বা ঋণ ও বিমার কাজে কাজ করেছি",
    "Tally-তে হিসাব করেছি বা GST দাখিল করেছি",
    "ফোন বা অভিযোগ সামলেছি",
    "পণ্য বিক্রি করেছি বা নতুন গ্রাহক খুঁজেছি",
    "সোশ্যাল মিডিয়ায় ব্যবসার প্রচার করেছি",
    "পোস্টার বা গ্রাফিক ডিজাইন বানিয়েছি",
    "ভিডিও বা ছবি এডিট করেছি",
    "প্রবন্ধ, পোস্ট বা স্ক্রিপ্ট লিখেছি",
    "এক ভাষা থেকে অন্য ভাষায় অনুবাদ করেছি",
    "তথ্য সংগ্রহ করেছি বা সমীক্ষা চালিয়েছি",
    "সংখ্যা বিশ্লেষণ করে চার্ট বানিয়েছি",
    "নিয়োগ বা কর্মীদের নথিতে সাহায্য করেছি",
    "আইনি কাগজপত্র বা নিয়মকানুনে সাহায্য করেছি",
    "ঝুঁকি যাচাই করেছি বা কোম্পানির নিয়ম মেনেছি",
    "কম্পিউটার ও নেটওয়ার্ক বসিয়েছি বা সারিয়েছি",
    "কম্পিউটার প্রোগ্রাম লিখেছি",
    "ডেটা, এআই বা মেশিন লার্নিং নিয়ে কাজ করেছি",
    "ইলেকট্রনিক্স বা সেন্সরের প্রজেক্ট বানিয়েছি",
]  # Bengali labels, same order as A (machine-translated, not reviewed)


def main():
    tax = json.loads((DATA / "v2/internsetu_taxonomy_v2.json").read_text(encoding="utf-8"))
    ids = {s["name"]: s["id"] for s in tax["skills"]}
    assert len(BN) == len(A), "BN must have one label per activity"
    missing = sorted({n for a in A for n in a[4] if n not in ids})
    if missing:
        raise SystemExit(f"unknown skill names: {missing}")
    out = [{"id": f"ACT-{i:03d}", "icon": icon, "label": {"en": en, "hi": hi, "mr": mr, "bn": BN[i - 1]}, "skill_ids": [ids[n] for n in names]}
           for i, (icon, en, hi, mr, names) in enumerate(A, 1)]
    (DATA / "activity_skill_map.json").write_text(json.dumps({"version": "1.0", "activities": out}, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"wrote {len(out)} activities")


if __name__ == "__main__":
    main()
