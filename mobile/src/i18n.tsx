// Lightweight i18n: English text is the key; hi/mr fall back to English if a string is missing.
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, getToken } from "./api";

export type Lang = "en" | "hi" | "mr";
export const LANGS: { code: Lang; label: string }[] = [{ code: "en", label: "English" }, { code: "hi", label: "हिन्दी" }, { code: "mr", label: "मराठी" }];
const KEY = "internsetu_lang";

const hi: Record<string, string> = {
  "Logout": "लॉगआउट", "Welcome back": "वापसी पर स्वागत है", "Sign in to InternSetu": "InternSetu में साइन इन करें",
  "Your pathway to meaningful internship opportunities.": "सार्थक इंटर्नशिप अवसरों की ओर आपका रास्ता।",
  "Email or mobile": "ईमेल या मोबाइल", "Enter your email or mobile number": "अपना ईमेल या मोबाइल नंबर दर्ज करें",
  "Password": "पासवर्ड", "Enter your password": "अपना पासवर्ड दर्ज करें", "Forgot password?": "पासवर्ड भूल गए?", "Login": "लॉगिन",
  "Don't have an account?": "खाता नहीं है?", "Register": "रजिस्टर करें", "Secure & simple access to InternSetu": "InternSetu तक सुरक्षित और आसान पहुँच",
  "Please enter your email or mobile and password.": "कृपया अपना ईमेल या मोबाइल और पासवर्ड दर्ज करें।", "Could not sign in.": "साइन इन नहीं हो सका।",
  "Join InternSetu": "InternSetu से जुड़ें", "Create your account": "अपना खाता बनाएँ", "It takes under a minute. Then we'll set up your profile.": "इसमें एक मिनट से भी कम लगता है। फिर हम आपकी प्रोफ़ाइल बनाएँगे।",
  "Full name": "पूरा नाम", "Your full name": "आपका पूरा नाम", "Email": "ईमेल", "Create a password": "पासवर्ड बनाएँ",
  "Too short": "बहुत छोटा", "Weak": "कमज़ोर", "Fair": "ठीक-ठाक", "Good": "अच्छा", "Strong": "मज़बूत", "8+ chars with a letter & a number": "8+ अक्षर, एक अक्षर और एक संख्या के साथ",
  "I accept the privacy notice and agree to InternSetu processing my profile data to recommend internships.": "मैं गोपनीयता सूचना स्वीकार करता/करती हूँ और इंटर्नशिप सुझाने के लिए InternSetu द्वारा मेरी प्रोफ़ाइल जानकारी के उपयोग से सहमत हूँ।",
  "Create account": "खाता बनाएँ", "Already have an account?": "पहले से खाता है?",
  "Please enter your full name.": "कृपया अपना पूरा नाम दर्ज करें।", "Please enter a valid email.": "कृपया सही ईमेल दर्ज करें।",
  "Password needs 8+ characters with a letter and a number.": "पासवर्ड में 8+ अक्षर होने चाहिए, जिसमें एक अक्षर और एक संख्या हो।",
  "Please accept the privacy notice to continue.": "आगे बढ़ने के लिए कृपया गोपनीयता सूचना स्वीकार करें।", "Could not create your account.": "खाता नहीं बन सका।",
  "Reset your password": "अपना पासवर्ड रीसेट करें", "Enter your email and we'll send you a reset link.": "अपना ईमेल दर्ज करें, हम आपको रीसेट लिंक भेजेंगे।",
  "If an account exists for that email, a reset link is on its way.": "अगर इस ईमेल का खाता मौजूद है, तो रीसेट लिंक भेज दिया गया है।",
  "Send reset link": "रीसेट लिंक भेजें", "← Back to login": "← लॉगिन पर वापस",
  "Privacy notice": "गोपनीयता सूचना",
  "InternSetu uses your education, skills and preferences only to recommend internships. Recommendations are guidance only; you apply through the official PMIS portal. You can withdraw consent at any time.": "InternSetu आपकी शिक्षा, कौशल और पसंद का उपयोग केवल इंटर्नशिप सुझाने के लिए करता है। सुझाव केवल मार्गदर्शन हैं; आवेदन आधिकारिक PMIS पोर्टल पर करें। आप कभी भी सहमति वापस ले सकते हैं।",
  "I agree, continue": "मैं सहमत हूँ, आगे बढ़ें", "Not now, log out": "अभी नहीं, लॉगआउट करें", "Could not save your consent.": "आपकी सहमति सहेजी नहीं जा सकी।",
  "LET'S GET STARTED": "शुरू करें", "Let's find the right internship for you": "आपके लिए सही इंटर्नशिप खोजें",
  "Tell us about your education, skills, and preferences so we can personalize your internship recommendations.": "अपनी शिक्षा, कौशल और पसंद बताएँ ताकि हम आपके लिए इंटर्नशिप सुझाव बेहतर बना सकें।",
  "details added": "जानकारी जोड़ी गई", "Education level": "शिक्षा स्तर", "Degree / Course": "डिग्री / कोर्स", "e.g. B.Tech, B.Com, BBA": "जैसे B.Tech, B.Com, BBA",
  "Field of study": "अध्ययन क्षेत्र", "e.g. Computer Science": "जैसे कंप्यूटर साइंस", "College / Institution": "कॉलेज / संस्थान", "Enter your college or institution": "अपने कॉलेज या संस्थान का नाम दर्ज करें",
  "Continue": "आगे बढ़ें", "Please fill in your degree, field of study and college.": "कृपया अपनी डिग्री, अध्ययन क्षेत्र और कॉलेज भरें।", "Could not save your details.": "आपकी जानकारी सहेजी नहीं जा सकी।",
  "Education": "शिक्षा", "Skills": "कौशल", "Preferences": "पसंद",
  "STEP 2 OF 3": "चरण 2 / 3", "Tell us what you're good at": "बताइए आप किसमें अच्छे हैं", "Select the skills you already have and the areas you're interested in exploring.": "अपने मौजूदा कौशल और रुचि के क्षेत्र चुनें।",
  "Your skills": "आपके कौशल", "Select all that apply.": "जो लागू हों सभी चुनें।", "selected": "चुने गए", "Search skills (e.g. Python)": "कौशल खोजें (जैसे Python)",
  "Your interests": "आपकी रुचियाँ", "What kind of work would you enjoy exploring?": "आप किस तरह का काम करना पसंद करेंगे?", "Search interests": "रुचियाँ खोजें", "← Back": "← वापस",
  "Please select at least one skill.": "कृपया कम से कम एक कौशल चुनें।", "Please select at least one interest.": "कृपया कम से कम एक रुचि चुनें।", "Could not save your skills.": "आपके कौशल सहेजे नहीं जा सके।",
  "STEP 3 OF 3": "चरण 3 / 3", "Where would you like to work?": "आप कहाँ काम करना चाहेंगे?", "Tell us about your location and work preferences so we can find opportunities that fit your situation.": "अपनी जगह और काम की पसंद बताएँ ताकि हम आपके अनुकूल अवसर ढूँढ सकें।",
  "Home city": "गृह शहर", "Search your city": "अपना शहर खोजें", "Are you willing to relocate?": "क्या आप दूसरी जगह जाने को तैयार हैं?", "This helps us include opportunities outside your preferred location.": "इससे हम आपकी पसंदीदा जगह के बाहर के अवसर भी शामिल कर पाते हैं।",
  "Yes": "हाँ", "I'm open to relocating": "मैं दूसरी जगह जा सकता/सकती हूँ", "No": "नहीं", "I prefer to stay nearby": "मैं आस-पास रहना पसंद करूँगा/करूँगी",
  "Preferred work mode": "पसंदीदा कार्य-मोड", "Choose the type of workplace you prefer.": "अपनी पसंद का कार्यस्थल चुनें।", "On-site": "ऑन-साइट", "Hybrid": "हाइब्रिड", "Remote": "रिमोट",
  "Preferred domains": "पसंदीदा क्षेत्र", "Select the areas you would like to explore.": "वे क्षेत्र चुनें जिन्हें आप जानना चाहते हैं।", "Search sectors": "क्षेत्र खोजें", "Find my internships": "मेरी इंटर्नशिप खोजें",
  "Please choose your home city.": "कृपया अपना गृह शहर चुनें।", "Please tell us whether you are willing to relocate.": "कृपया बताएँ कि क्या आप दूसरी जगह जाने को तैयार हैं।",
  "Please select your preferred work mode.": "कृपया अपना पसंदीदा कार्य-मोड चुनें।", "Please select at least one preferred domain.": "कृपया कम से कम एक क्षेत्र चुनें।",
  "Please complete your profile first.": "कृपया पहले अपनी प्रोफ़ाइल पूरी करें।", "Could not save your preferences.": "आपकी पसंद सहेजी नहीं जा सकी।",
  "Search…": "खोजें…", "No matches. Try a different word.": "कोई परिणाम नहीं। कोई दूसरा शब्द आज़माएँ।",
  "PERSONALISED FOR YOU": "आपके लिए खास", "Your internship matches": "आपकी इंटर्नशिप मैच", "Ranked by skills, education, location and interests, with reasons for each match.": "कौशल, शिक्षा, स्थान और रुचि के आधार पर क्रमबद्ध, हर मैच के कारण सहित।",
  "Eligible": "पात्र", "Top picks": "शीर्ष चयन", "Best match": "सर्वश्रेष्ठ मैच", "Edit profile": "प्रोफ़ाइल बदलें", "Change preferences": "पसंद बदलें", "Saved": "सहेजी गई",
  "Something went wrong": "कुछ गड़बड़ हो गई", "Try again": "फिर कोशिश करें", "No eligible internships yet": "अभी कोई पात्र इंटर्नशिप नहीं", "Missing:": "कमी:",
  "Why recommended": "क्यों सुझाई गई", "Keep in mind": "ध्यान रखें", "Skills to build": "सीखने योग्य कौशल", "Apply on PMIS": "PMIS पर आवेदन करें", "Demo data": "डेमो डेटा", "Stipend not listed": "वजीफ़ा सूचीबद्ध नहीं",
  "Saved for later.": "बाद के लिए सहेजा गया।", "Removed from saved.": "सहेजी गई सूची से हटाया गया।", "Could not update saved list.": "सहेजी गई सूची अपडेट नहीं हो सकी।",
  "Could not open the PMIS portal link.": "PMIS पोर्टल लिंक नहीं खुल सका।", "Could not load recommendations.": "सुझाव लोड नहीं हो सके।",
  "Saved internships": "सहेजी गई इंटर्नशिप", "Skills that would help most": "सबसे ज़्यादा मददगार कौशल", "Internships you bookmarked. Tap the heart on a recommendation to save it.": "आपकी बुकमार्क की गई इंटर्नशिप। सहेजने के लिए सुझाव पर दिल के निशान पर टैप करें।",
  "No saved internships yet.": "अभी कोई सहेजी गई इंटर्नशिप नहीं।", "Remove": "हटाएँ", "match": "मैच", "← Back to recommendations": "← सुझावों पर वापस", "Could not load saved internships.": "सहेजी गई इंटर्नशिप लोड नहीं हो सकीं।",
};

const mr: Record<string, string> = {
  "Logout": "लॉगआउट", "Welcome back": "पुन्हा स्वागत", "Sign in to InternSetu": "InternSetu मध्ये साइन इन करा",
  "Your pathway to meaningful internship opportunities.": "अर्थपूर्ण इंटर्नशिप संधींकडे जाणारा तुमचा मार्ग.",
  "Email or mobile": "ईमेल किंवा मोबाइल", "Enter your email or mobile number": "तुमचा ईमेल किंवा मोबाइल नंबर टाका",
  "Password": "पासवर्ड", "Enter your password": "तुमचा पासवर्ड टाका", "Forgot password?": "पासवर्ड विसरलात?", "Login": "लॉगिन",
  "Don't have an account?": "खाते नाही?", "Register": "नोंदणी करा", "Secure & simple access to InternSetu": "InternSetu ला सुरक्षित आणि सोपा प्रवेश",
  "Please enter your email or mobile and password.": "कृपया तुमचा ईमेल किंवा मोबाइल आणि पासवर्ड टाका.", "Could not sign in.": "साइन इन करता आले नाही.",
  "Join InternSetu": "InternSetu मध्ये सामील व्हा", "Create your account": "तुमचे खाते तयार करा", "It takes under a minute. Then we'll set up your profile.": "यास एका मिनिटापेक्षा कमी वेळ लागतो. मग आपण तुमची प्रोफाइल तयार करू.",
  "Full name": "पूर्ण नाव", "Your full name": "तुमचे पूर्ण नाव", "Email": "ईमेल", "Create a password": "पासवर्ड तयार करा",
  "Too short": "खूप लहान", "Weak": "कमकुवत", "Fair": "ठीक", "Good": "चांगला", "Strong": "मजबूत", "8+ chars with a letter & a number": "8+ अक्षरे, एक अक्षर आणि एक अंक असलेला",
  "I accept the privacy notice and agree to InternSetu processing my profile data to recommend internships.": "मी गोपनीयता सूचना स्वीकारतो/स्वीकारते आणि इंटर्नशिप सुचवण्यासाठी InternSetu ने माझी प्रोफाइल माहिती वापरण्यास सहमत आहे.",
  "Create account": "खाते तयार करा", "Already have an account?": "आधीच खाते आहे?",
  "Please enter your full name.": "कृपया तुमचे पूर्ण नाव टाका.", "Please enter a valid email.": "कृपया योग्य ईमेल टाका.",
  "Password needs 8+ characters with a letter and a number.": "पासवर्डमध्ये 8+ अक्षरे असावीत, त्यात एक अक्षर आणि एक अंक हवा.",
  "Please accept the privacy notice to continue.": "पुढे जाण्यासाठी कृपया गोपनीयता सूचना स्वीकारा.", "Could not create your account.": "खाते तयार करता आले नाही.",
  "Reset your password": "तुमचा पासवर्ड रीसेट करा", "Enter your email and we'll send you a reset link.": "तुमचा ईमेल टाका, आम्ही तुम्हाला रीसेट लिंक पाठवू.",
  "If an account exists for that email, a reset link is on its way.": "या ईमेलचे खाते असल्यास, रीसेट लिंक पाठवली जात आहे.",
  "Send reset link": "रीसेट लिंक पाठवा", "← Back to login": "← लॉगिनकडे परत",
  "Privacy notice": "गोपनीयता सूचना",
  "InternSetu uses your education, skills and preferences only to recommend internships. Recommendations are guidance only; you apply through the official PMIS portal. You can withdraw consent at any time.": "InternSetu तुमचे शिक्षण, कौशल्ये आणि आवडीनिवडी फक्त इंटर्नशिप सुचवण्यासाठी वापरते. शिफारशी केवळ मार्गदर्शनासाठी आहेत; अर्ज अधिकृत PMIS पोर्टलवर करा. तुम्ही केव्हाही संमती मागे घेऊ शकता.",
  "I agree, continue": "मी सहमत आहे, पुढे जा", "Not now, log out": "आता नाही, लॉगआउट करा", "Could not save your consent.": "तुमची संमती जतन करता आली नाही.",
  "LET'S GET STARTED": "चला सुरू करूया", "Let's find the right internship for you": "तुमच्यासाठी योग्य इंटर्नशिप शोधूया",
  "Tell us about your education, skills, and preferences so we can personalize your internship recommendations.": "तुमचे शिक्षण, कौशल्ये आणि आवडीनिवडी सांगा, म्हणजे आम्ही तुमच्यासाठी इंटर्नशिप शिफारशी अधिक योग्य करू शकू.",
  "details added": "माहिती भरली", "Education level": "शिक्षणाची पातळी", "Degree / Course": "पदवी / अभ्यासक्रम", "e.g. B.Tech, B.Com, BBA": "उदा. B.Tech, B.Com, BBA",
  "Field of study": "अभ्यासाचे क्षेत्र", "e.g. Computer Science": "उदा. कॉम्प्युटर सायन्स", "College / Institution": "महाविद्यालय / संस्था", "Enter your college or institution": "तुमच्या महाविद्यालयाचे किंवा संस्थेचे नाव टाका",
  "Continue": "पुढे जा", "Please fill in your degree, field of study and college.": "कृपया तुमची पदवी, अभ्यासाचे क्षेत्र आणि महाविद्यालय भरा.", "Could not save your details.": "तुमची माहिती जतन करता आली नाही.",
  "Education": "शिक्षण", "Skills": "कौशल्ये", "Preferences": "आवडीनिवडी",
  "STEP 2 OF 3": "पायरी 2 / 3", "Tell us what you're good at": "तुम्ही कशात चांगले आहात ते सांगा", "Select the skills you already have and the areas you're interested in exploring.": "तुमच्याकडे असलेली कौशल्ये आणि आवडीची क्षेत्रे निवडा.",
  "Your skills": "तुमची कौशल्ये", "Select all that apply.": "लागू असलेली सर्व निवडा.", "selected": "निवडले", "Search skills (e.g. Python)": "कौशल्ये शोधा (उदा. Python)",
  "Your interests": "तुमच्या आवडी", "What kind of work would you enjoy exploring?": "तुम्हाला कोणत्या प्रकारचे काम करायला आवडेल?", "Search interests": "आवडी शोधा", "← Back": "← मागे",
  "Please select at least one skill.": "कृपया किमान एक कौशल्य निवडा.", "Please select at least one interest.": "कृपया किमान एक आवड निवडा.", "Could not save your skills.": "तुमची कौशल्ये जतन करता आली नाहीत.",
  "STEP 3 OF 3": "पायरी 3 / 3", "Where would you like to work?": "तुम्हाला कुठे काम करायला आवडेल?", "Tell us about your location and work preferences so we can find opportunities that fit your situation.": "तुमचे ठिकाण आणि कामाच्या आवडीनिवडी सांगा, म्हणजे आम्ही तुम्हाला साजेशा संधी शोधू शकू.",
  "Home city": "मूळ शहर", "Search your city": "तुमचे शहर शोधा", "Are you willing to relocate?": "तुम्ही दुसऱ्या ठिकाणी जाण्यास तयार आहात का?", "This helps us include opportunities outside your preferred location.": "यामुळे तुमच्या पसंतीच्या ठिकाणाबाहेरील संधीही समाविष्ट करता येतात.",
  "Yes": "होय", "I'm open to relocating": "मी दुसऱ्या ठिकाणी जाऊ शकतो/शकते", "No": "नाही", "I prefer to stay nearby": "मला जवळपास राहायला आवडेल",
  "Preferred work mode": "पसंतीचा कामाचा प्रकार", "Choose the type of workplace you prefer.": "तुम्हाला आवडणारे कामाचे ठिकाण निवडा.", "On-site": "ऑन-साइट", "Hybrid": "हायब्रिड", "Remote": "रिमोट",
  "Preferred domains": "पसंतीची क्षेत्रे", "Select the areas you would like to explore.": "तुम्हाला जाणून घ्यायची क्षेत्रे निवडा.", "Search sectors": "क्षेत्रे शोधा", "Find my internships": "माझ्या इंटर्नशिप शोधा",
  "Please choose your home city.": "कृपया तुमचे मूळ शहर निवडा.", "Please tell us whether you are willing to relocate.": "कृपया तुम्ही दुसऱ्या ठिकाणी जाण्यास तयार आहात का ते सांगा.",
  "Please select your preferred work mode.": "कृपया तुमचा पसंतीचा कामाचा प्रकार निवडा.", "Please select at least one preferred domain.": "कृपया किमान एक क्षेत्र निवडा.",
  "Please complete your profile first.": "कृपया आधी तुमची प्रोफाइल पूर्ण करा.", "Could not save your preferences.": "तुमच्या आवडीनिवडी जतन करता आल्या नाहीत.",
  "Search…": "शोधा…", "No matches. Try a different word.": "काहीही सापडले नाही. दुसरा शब्द वापरून पहा.",
  "PERSONALISED FOR YOU": "तुमच्यासाठी खास", "Your internship matches": "तुमच्या इंटर्नशिप जुळणी", "Ranked by skills, education, location and interests, with reasons for each match.": "कौशल्ये, शिक्षण, ठिकाण आणि आवडीनुसार क्रमवारी, प्रत्येक जुळणीच्या कारणांसह.",
  "Eligible": "पात्र", "Top picks": "सर्वोत्तम निवडी", "Best match": "सर्वोत्तम जुळणी", "Edit profile": "प्रोफाइल बदला", "Change preferences": "आवडीनिवडी बदला", "Saved": "जतन केलेल्या",
  "Something went wrong": "काहीतरी चूक झाली", "Try again": "पुन्हा प्रयत्न करा", "No eligible internships yet": "अजून पात्र इंटर्नशिप नाहीत", "Missing:": "कमतरता:",
  "Why recommended": "का सुचवली", "Keep in mind": "लक्षात ठेवा", "Skills to build": "शिकण्यासारखी कौशल्ये", "Apply on PMIS": "PMIS वर अर्ज करा", "Demo data": "डेमो डेटा", "Stipend not listed": "विद्यावेतन नमूद नाही",
  "Saved for later.": "नंतरसाठी जतन केले.", "Removed from saved.": "जतन केलेल्या यादीतून काढले.", "Could not update saved list.": "जतन केलेली यादी अपडेट करता आली नाही.",
  "Could not open the PMIS portal link.": "PMIS पोर्टलची लिंक उघडता आली नाही.", "Could not load recommendations.": "शिफारशी लोड करता आल्या नाहीत.",
  "Saved internships": "जतन केलेल्या इंटर्नशिप", "Skills that would help most": "सर्वाधिक उपयुक्त कौशल्ये", "Internships you bookmarked. Tap the heart on a recommendation to save it.": "तुम्ही बुकमार्क केलेल्या इंटर्नशिप. जतन करण्यासाठी शिफारशीवरील हृदयावर टॅप करा.",
  "No saved internships yet.": "अजून जतन केलेल्या इंटर्नशिप नाहीत.", "Remove": "काढा", "match": "जुळणी", "← Back to recommendations": "← शिफारशींकडे परत", "Could not load saved internships.": "जतन केलेल्या इंटर्नशिप लोड करता आल्या नाहीत.",
};
const dicts: Record<Lang, Record<string, string>> = { en: {}, hi, mr };

type Ctx = { lang: Lang; setLang: (l: Lang, sync?: boolean) => void; t: (s: string) => string };
const I18nCtx = createContext<Ctx>({ lang: "en", setLang: () => {}, t: (s) => s });
export const useI18n = () => useContext(I18nCtx);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  useEffect(() => { AsyncStorage.getItem(KEY).then((v) => { if (v === "hi" || v === "mr" || v === "en") setLangState(v); }).catch(() => {}); }, []);
  const setLang = useCallback((l: Lang, sync = true) => {
    setLangState(l);
    AsyncStorage.setItem(KEY, l).catch(() => {});
    if (sync) getToken().then((tk) => { if (tk) api.updateSettings(l).catch(() => {}); });
  }, []);
  const t = useCallback((s: string) => dicts[lang][s] ?? s, [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
