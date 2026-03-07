PERIOD_MOTION_STYLE = {
    "1925": "Camera slowly pans left to right, warm sepia-toned light, vintage film flicker, contemplative pace",
    "1965": "Gentle documentary zoom-in toward the scene, natural ambient lighting, observational style",
    "1985": "Medium dolly shot moving slowly forward, warm Singapore afternoon light, active street life",
    "present": "Smooth cinematic tracking shot at pedestrian height, dynamic modern city life",
    "2040": "Fluid forward motion through integrated nature and architecture, soft diffused light, futuristic calm",
    "2070": "Sweeping reveal pan from right to left, dramatic tropical sky, advanced sustainable urban environment",
}


def build_video_prompt_generation_prompt(
    location_name: str,
    period: str,
    research_summary: str,
    atmosphere: str,
    street_level_details: str,
) -> str:
    motion = PERIOD_MOTION_STYLE[period]
    return f"""
Write a Veo 3 video generation prompt for a 6-second cinematic clip.

Location: {location_name}, Singapore, year {period}
Research summary: {research_summary}
Atmosphere: {atmosphere}
Street level scene: {street_level_details}
Camera movement style: {motion}

The video prompt MUST:
1. Open with the camera movement description
2. Describe the scene in vivid sensory and visual detail specific to {period}
3. Specify Singapore tropical lighting conditions
4. Include ambient sound cues (Veo 3 generates audio — be specific: hawker chatter, rain, construction, birds, traffic)
5. Describe people and their period-appropriate activities
6. End with the emotional/cinematic tone
7. Be exactly 3-5 sentences
8. NOT include text overlays, titles, or post-processing effects
9. Only describe elements authentic to {period}

Output ONLY the video prompt text. No preamble, no explanation.
"""
