PERIOD_CONTEXT = {
    "1925": {
        "era": "British colonial Singapore, Straits Settlements era",
        "focus": "colonial architecture, immigrant communities (Chinese, Indian, Malay), kampong life, trade port activity, rickshaws, godowns",
        "sources_hint": "National Archives Singapore (NAS) photo archives, Survey Department maps, colonial Straits Times, NLB Singapore Infopedia",
        "time_descriptor": "the year 1925",
    },
    "1965": {
        "era": "Singapore's independence year, early PAP governance under Lee Kuan Yew",
        "focus": "post-independence urban reality, early HDB resettlement, kampong clearances, hawker centres, small industries",
        "sources_hint": "NAS photo archives, early Singapore newspapers, Singapore History Gallery, Memories at Old Ford Factory",
        "time_descriptor": "the year 1965, Singapore's independence year",
    },
    "1985": {
        "era": "Singapore's rapid modernisation, economic recession then recovery",
        "focus": "MRT construction (opened 1987), Orchard Road shopping, HDB new towns, conservation of shophouses begins, SAF National Service",
        "sources_hint": "URA conservation records, Straits Times 1985 archives, early MRT construction photos, NAS",
        "time_descriptor": "the year 1985",
    },
    "present": {
        "era": "Contemporary Singapore 2024-2025",
        "focus": "current urban character, mix of heritage and modern, green buildings, MRT network, food courts, hawker centres",
        "sources_hint": "OneMap Singapore, StreetDirectory, recent news, Google Maps Street View descriptions",
        "time_descriptor": "present day (2024-2025)",
    },
    "2040": {
        "era": "Near-future Singapore guided by URA Master Plan and Long-Term Plan Review",
        "focus": "URA Long-Term Plan Review 2021, green corridors, sea-level adaptation, car-lite neighbourhoods, more parks",
        "sources_hint": "URA Long-Term Plan Review 2021, Singapore Green Plan 2030, BCA Green Building Masterplan, CLC research",
        "time_descriptor": "the year 2040 based on URA Master Plan projections",
    },
    "2070": {
        "era": "Long-term future Singapore with advanced climate adaptation",
        "focus": "sea-level rise coastal infrastructure, floating districts, post-car city, vertical farms, demographic shifts, autonomous transport",
        "sources_hint": "Singapore Third National Climate Change Study, Centre for Liveable Cities, Singapore 100 Smart Nation vision",
        "time_descriptor": "the year 2070 based on long-range urban and climate projections",
    },
}


def build_research_prompt(location_name: str, neighborhood: str, landmark_type: str, period: str) -> str:
    ctx = PERIOD_CONTEXT[period]
    return f"""
You are a Singapore urban historian and futurist with access to Google Search.

Research what this specific location looked like during {ctx['time_descriptor']}.

Location: {location_name}
Neighborhood: {neighborhood}
Type: {landmark_type}

Era context: {ctx['era']}
Research focus: {ctx['focus']}
Recommended sources to search: {ctx['sources_hint']}

Use Google Search to find information about this EXACT location in {period}.
Search queries to try:
- "{location_name} {period}"
- "{neighborhood} Singapore {period} history"
- "Singapore {period} {landmark_type} urban development"

Return ONLY a JSON object:
{{
  "period": "{period}",
  "summary": "3-4 sentences vividly describing the location in {period}. Be specific about what existed then.",
  "key_visual_facts": ["5-7 specific visual details: materials, colors, signage, people, vehicles, vegetation"],
  "atmosphere": "One sentence describing the mood and sensory atmosphere for video generation",
  "architectural_style": "Dominant architectural vocabulary at this location in {period}",
  "street_level_details": "What a pedestrian standing here would see and experience in {period}",
  "sources_used": ["list of actual source names found"]
}}
"""
