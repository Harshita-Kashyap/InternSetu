from app.services.localize import localize, tr_text


def test_known_sentences_are_translated():
    assert tr_text("Located in your home location", "hi") == "आपके गृह स्थान पर स्थित है"
    s = "Skills: 3 of 4 required/preferred skills matched (Python, SQL)"
    assert "3" in tr_text(s, "mr") and "Python, SQL" in tr_text(s, "mr")
    assert tr_text("Missing mandatory skill(s): Excel; Education level below requirement (candidate: A, required: B)", "hi").startswith("अनिवार्य कौशल की कमी: Excel")


def test_english_and_unknown_text_unchanged():
    assert tr_text("Something new", "hi") == "Something new"
    assert localize({"why_recommended": ["Located in your home location"]}, "en") == {"why_recommended": ["Located in your home location"]}


def test_nested_response_is_localized():
    out = localize({"recommendations": [{"considerations": ["Stipend is below your expectation"], "title": "Keep me"}], "disclaimer": "InternSetu only suggests internships. x"}, "mr")
    assert out["recommendations"][0]["title"] == "Keep me" and out["recommendations"][0]["considerations"][0].startswith("विद्यावेतन")
    assert out["disclaimer"].startswith("InternSetu फक्त")
