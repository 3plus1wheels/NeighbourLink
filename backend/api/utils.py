"""
Utility functions for the API - Coordinate based proximity
"""
from decimal import Decimal
import logging
from math import radians, cos, sin, asin, sqrt

logger = logging.getLogger(__name__)


def haversine_distance(lat1, lon1, lat2, lon2):
    """
    Calculate distance between two points in kilometers using Haversine formula
    
    Args:
        lat1, lon1: Coordinates of first point
        lat2, lon2: Coordinates of second point
    
    Returns:
        Distance in kilometers
    """
    if isinstance(lat1, Decimal):
        lat1 = float(lat1)
    if isinstance(lon1, Decimal):
        lon1 = float(lon1)
    if isinstance(lat2, Decimal):
        lat2 = float(lat2)
    if isinstance(lon2, Decimal):
        lon2 = float(lon2)
    
    lon1, lat1, lon2, lat2 = map(radians, [lon1, lat1, lon2, lat2])
    dlon = lon2 - lon1
    dlat = lat2 - lat1
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlon/2)**2
    c = 2 * asin(sqrt(a))
    r = 6371  # Radius of earth in kilometers
    return c * r


def get_posts_by_coordinate_radius(user_latitude, user_longitude, radius_km=3):
    """
    Get all posts within a radius based on coordinates (Haversine distance)
    
    Args:
        user_latitude: User's latitude
        user_longitude: User's longitude
        radius_km: Radius in kilometers (default 3km)
    
    Returns:
        List of Post objects within the radius, ordered by distance (closest first)
    """
    from .models import Post
    
    if not user_latitude or not user_longitude:
        logger.warning("⚠️  No user coordinates provided")
        return []
    
    logger.info(f"�� Searching for posts near coordinates: {user_latitude}, {user_longitude}")
    logger.info(f"   Radius: {radius_km}km")
    
    # Get all posts with coordinates
    all_posts = Post.objects.exclude(
        latitude__isnull=True
    ).exclude(
        longitude__isnull=True
    )
    
    logger.info(f"🗂️  Total posts with coordinates: {all_posts.count()}")
    
    # Calculate distance for each post and filter by radius
    posts_with_distance = []
    
    for post in all_posts:
        distance = haversine_distance(
            user_latitude, user_longitude,
            post.latitude, post.longitude
        )
        
        logger.info(f"   Post #{post.id}: '{post.title}' | Distance: {distance:.2f}km")
        
        if distance <= radius_km:
            posts_with_distance.append({
                'post': post,
                'distance': distance
            })
    
    # Sort by distance (closest first)
    posts_with_distance.sort(key=lambda x: x['distance'])
    
    logger.info(f"📬 Found {len(posts_with_distance)} posts within {radius_km}km")
    
    if posts_with_distance:
        logger.info(f"🎯 Matched posts (sorted by distance):")
        for item in posts_with_distance:
            post = item['post']
            distance = item['distance']
            logger.info(f"  • Post #{post.id}: '{post.title}' | {distance:.2f}km away")
    else:
        logger.warning(f"❌ No posts found within {radius_km}km")
    
    # Return just the posts (already sorted by distance)
    return [item['post'] for item in posts_with_distance]


def get_user_coordinates(user):
    """
    Get the user's coordinates from their profile
    
    Args:
        user: User object
    
    Returns:
        Tuple of (latitude, longitude) or (None, None)
    """
    try:
        if hasattr(user, 'profile') and user.profile.latitude and user.profile.longitude:
            return user.profile.latitude, user.profile.longitude
        return None, None
    except Exception as e:
        logger.error(f"Error getting user coordinates: {str(e)}")
        return None, None
