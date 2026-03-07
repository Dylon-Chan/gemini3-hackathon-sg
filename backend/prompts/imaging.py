PERIOD_VISUAL_STYLE = {
    "1925": "aged sepia-toned photograph style, soft warm golden tones, visible film grain, colonial-era aesthetic, painterly quality",
    "1965": "1960s documentary photograph style, slightly faded Kodachrome colors, mid-century aesthetic, slightly overexposed",
    "1985": "1980s color photograph style, vivid but slightly oversaturated, sharp consumer film quality, warm afternoon light",
    "present": "modern HDR digital photography, sharp, high contrast, contemporary Singapore aesthetics, blue sky",
    "2040": "near-future architectural visualization, lush biophilic design, integrated greenery, clean lines, soft natural light",
    "2070": "speculative future cityscape render, advanced sustainable architecture, dramatic sky, futuristic organic forms",
}


def build_imaging_prompt(
    location_name: str,
    period: str,
    research_summary: str,
    key_visual_facts: list[str],
    atmosphere: str,
    architectural_style: str,
    street_level_details: str,
) -> str:
    style = PERIOD_VISUAL_STYLE[period]
    facts_str = "\n".join(f"  - {f}" for f in key_visual_facts)

    return f"""
Generate a photorealistic, cinematic 16:9 image of {location_name} in Singapore during the year {period}.

Visual photographic style: {style}

Context from historical research:
Summary: {research_summary}
Key visual elements to include:
{facts_str}
Atmosphere: {atmosphere}
Architectural style: {architectural_style}
Street level: {street_level_details}

Composition requirements:
- Camera at eye level or very slight elevation
- Show the full architectural character and surrounding streetscape
- Include period-appropriate people, vehicles, signage, and vegetation
- Singapore tropical sky: partly cloudy, humid atmospheric haze, warm light
- No text watermarks, no UI elements, no borders
- Suitable as a video generation reference frame: clear foreground/background separation

Strict period accuracy for {period}:
- ONLY show architecture, technology, fashion, signage, vehicles from {period} or earlier
- NO anachronistic elements whatsoever
- High photorealistic detail, cinematic composition
"""
