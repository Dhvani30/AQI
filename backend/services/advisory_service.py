def classify(aqi: float) -> str:
    if aqi <= 50:
        return "Good"
    if aqi <= 100:
        return "Moderate"
    if aqi <= 150:
        return "Unhealthy for Sensitive Groups"
    if aqi <= 200:
        return "Unhealthy"
    if aqi <= 300:
        return "Very Unhealthy"
    return "Hazardous"


def build_advisory(aqi: float, threshold: int, health_profile: dict) -> dict:
    alert = aqi > threshold
    advisories = []

    if alert:
        advisories.append(
            f"AQI {aqi:.0f} exceeds your personal alert threshold of {threshold}."
        )
        if health_profile.get("is_asthmatic"):
            advisories.append(
                "If you have asthma, follow your care plan and consider limiting outdoor exertion."
            )
        if health_profile.get("is_elderly"):
            advisories.append(
                "Older adults may wish to limit prolonged outdoor activity while air quality is poor."
            )
        if health_profile.get("has_children"):
            advisories.append(
                "Consider limiting strenuous outdoor activity for children while air quality is poor."
            )
        if not any(
            health_profile.get(key)
            for key in ("is_asthmatic", "is_elderly", "has_children")
        ):
            advisories.append(
                "Consider reducing prolonged or strenuous outdoor activity."
            )
    else:
        advisories.append(
            f"AQI {aqi:.0f} is within your personal alert threshold of {threshold}."
        )

    return {
        "aqi": aqi,
        "personal_threshold": threshold,
        "category": classify(aqi),
        "alert": alert,
        "advisories": advisories,
    }
