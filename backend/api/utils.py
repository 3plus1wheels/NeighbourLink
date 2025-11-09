"""
Utility functions for the API - Coordinate based proximity and SMS
"""
from decimal import Decimal
import logging
from math import radians, cos, sin, asin, sqrt
from django.conf import settings

logger = logging.getLogger(__name__)


def send_sms(to_phone_number, message):
    """
    Send SMS using Twilio
    
    Args:
        to_phone_number (str): Recipient's phone number in E.164 format (e.g., '+1234567890')
        message (str): SMS message content
    
    Returns:
        bool: True if SMS was sent successfully, False otherwise
    """
    try:
        from twilio.rest import Client
        from twilio.base.exceptions import TwilioRestException
        
        # Check if Twilio is configured
        if not all([settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN, settings.TWILIO_PHONE_NUMBER]):
            logger.warning("Twilio credentials not configured. SMS not sent.")
            return False
        
        # Ensure phone number is in E.164 format
        if not to_phone_number.startswith('+'):
            logger.error(f"Phone number {to_phone_number} must be in E.164 format (start with +)")
            return False
        
        # Initialize Twilio client
        client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
        
        # Send SMS
        sms_message = client.messages.create(
            body=message,
            from_=settings.TWILIO_PHONE_NUMBER,
            to=to_phone_number
        )
        
        logger.info(f"SMS sent successfully to {to_phone_number}. SID: {sms_message.sid}")
        return True
        
    except Exception as e:
        logger.error(f"Error sending SMS to {to_phone_number}: {e}")
        return False


def format_phone_number(phone_number, country_code='+1'):
    """
    Format phone number to E.164 format
    
    Args:
        phone_number (str): Phone number in any format
        country_code (str): Default country code (default: +1 for US/Canada)
    
    Returns:
        str: Phone number in E.164 format or None if invalid
    """
    if not phone_number:
        return None
    
    # Remove all non-digit characters
    digits = ''.join(filter(str.isdigit, phone_number))
    
    # If already has +, check if valid
    if phone_number.startswith('+'):
        # Make sure it has digits after +
        if len(digits) >= 10:
            return phone_number.replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        return None
    
    # If 10 digits, assume US/Canada
    if len(digits) == 10:
        return f"{country_code}{digits}"
    
    # If 11 digits and starts with 1, assume US/Canada
    if len(digits) == 11 and digits.startswith('1'):
        return f"+{digits}"
    
    # Return with country code if we have reasonable length
    if len(digits) >= 10:
        return f"{country_code}{digits}"
    
    logger.warning(f"Invalid phone number format: {phone_number}")
    return None


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
