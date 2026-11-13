"""Free-course search links for a skill (tracker #11). These are SEARCH links to free learning sites, not specific
courses: nothing here claims a particular course exists, and the links work in every language the sites support."""
from urllib.parse import quote_plus


def course_links(skill_name: str) -> list[dict]:
    q = quote_plus(skill_name)
    return [
        {"provider": "SWAYAM", "url": f"https://swayam.gov.in/explorer?searchText={q}"},
        {"provider": "YouTube", "url": f"https://www.youtube.com/results?search_query={quote_plus(skill_name + ' free course')}"},
    ]
