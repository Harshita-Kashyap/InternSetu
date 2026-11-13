"""Straight-line distance between two places (tracker #20). Coordinates are approximate for small towns."""
from math import asin, cos, radians, sin, sqrt


def haversine_km(a, b):
    """Great-circle distance in km between (lat, lng) pairs, or None if either is missing."""
    if not a or not b:
        return None
    (la1, lo1), (la2, lo2) = a, b
    p1, p2 = radians(la1), radians(la2)
    h = sin((p2 - p1) / 2) ** 2 + cos(p1) * cos(p2) * sin(radians(lo2 - lo1) / 2) ** 2
    return 2 * 6371.0 * asin(sqrt(h))
