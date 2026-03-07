LOCATION_ANALYSIS_PROMPT = """
You are an expert on Singapore's urban geography, architecture, and landmarks.

Analyze this photograph and identify the Singapore location depicted.

Return ONLY a JSON object with exactly these fields:
{
  "location_name": "Full descriptive name (e.g. 'Raffles Place MRT Station, Central Business District')",
  "coordinates": {"lat": 1.2840, "lng": 103.8510},
  "confidence": 0.92,
  "neighborhood": "CBD / Chinatown / Orchard / Toa Payoh / etc.",
  "landmark_type": "MRT station / shophouse / HDB estate / colonial building / park / etc.",
  "notable_features": ["list", "of", "visible", "features", "in", "the", "image"],
  "description": "2-sentence description of what is shown in the photograph"
}

Rules:
- Coordinates MUST be within Singapore bounds: lat 1.15-1.48, lng 103.6-104.1
- If you cannot identify a specific location, use your best estimate and set confidence below 0.5
- Be specific: prefer "Tanjong Pagar Railway Station" over "a train station"
- notable_features should describe what is VISUALLY present
"""
