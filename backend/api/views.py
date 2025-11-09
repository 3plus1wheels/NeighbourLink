"""
API Views for NeighbourLink Application

This module contains all the API endpoints for the NeighbourLink application including:
- User authentication (register, login, logout)
- Post management (create, read, update, delete)
- User profile management
- Notification preferences

All endpoints use JWT authentication except for register and login.
"""

from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import (
    RegisterSerializer, LoginSerializer, UserSerializer,
    PostCreateSerializer, PostListSerializer, PostSerializer,
    ProfileDetailSerializer, ProfileUpdateSerializer,
    NotificationPreferenceUpdateSerializer, PostUpdateSerializer
)
from .models import Post, Profile, NotificationPreference
import logging
import traceback

# Initialize logger for tracking API operations and debugging
logger = logging.getLogger(__name__)


# ============================================================================
# AUTHENTICATION VIEWS
# ============================================================================

@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user account.
    
    This endpoint allows anyone to create a new user account. Upon successful
    registration, it automatically creates an associated Profile and 
    NotificationPreference object (handled by signals in models.py).
    
    Args:
        request: HTTP request containing user registration data:
            - email (str): User's email address (required, unique)
            - username (str): Username (required, unique)
            - password (str): Password (required, min 8 characters)
            - first_name (str): First name (optional)
            - last_name (str): Last name (optional)
    
    Returns:
        Response: JSON containing:
            - user: Serialized user data
            - refresh: JWT refresh token
            - access: JWT access token
            - message: Success message
        
    Status Codes:
        - 201: User successfully created
        - 400: Invalid data (validation errors)
        - 500: Server error during registration
    """
    try:
        # Log registration attempt for monitoring
        logger.info(f"Registration attempt with data: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        
        # Validate incoming data
        if serializer.is_valid():
            logger.info("Serializer is valid, creating user...")
            # Save new user to database
            user = serializer.save()
            # Generate JWT tokens for immediate login
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"User created successfully: {user.username}")
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
        else:
            # Return validation errors
            logger.error(f"Serializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        # Log unexpected errors with full traceback for debugging
        logger.error(f"Registration error: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response({
            'error': 'Registration failed',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def login(request):
    """
    Authenticate user and generate JWT tokens.
    
    This endpoint authenticates a user with email and password, then generates
    JWT access and refresh tokens for subsequent authenticated requests.
    
    Args:
        request: HTTP request containing login credentials:
            - email (str): User's email address
            - password (str): User's password
    
    Returns:
        Response: JSON containing:
            - user: Serialized user data
            - refresh: JWT refresh token (use to get new access tokens)
            - access: JWT access token (use in Authorization header)
            - message: Success message
        
    Status Codes:
        - 200: Login successful
        - 400: Invalid credentials or validation error
        - 500: Server error during login
    """
    try:
        # Log login attempt (email only, never log passwords)
        logger.info(f"Login attempt for email: {request.data.get('email')}")
        serializer = LoginSerializer(data=request.data)
        
        # Validate credentials
        if serializer.is_valid():
            # Retrieve authenticated user from validated data
            user = serializer.validated_data['user']
            # Generate new JWT tokens
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"Login successful for user: {user.username}")
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            # Return authentication errors
            logger.error(f"Login validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        # Log unexpected errors
        logger.error(f"Login error: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response({
            'error': 'Login failed',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout(request):
    """
    Logout user by blacklisting their refresh token.
    
    This endpoint invalidates the user's refresh token by adding it to the
    blacklist, preventing it from being used to generate new access tokens.
    The user must be authenticated to logout.
    
    Args:
        request: HTTP request containing:
            - refresh (str): JWT refresh token to blacklist
    
    Returns:
        Response: JSON with success message
        
    Status Codes:
        - 200: Logout successful
        - 400: Invalid or missing refresh token
    
    Note:
        This requires djangorestframework-simplejwt's token blacklist feature
        to be enabled in settings.
    """
    try:
        # Extract refresh token from request body
        refresh_token = request.data.get('refresh')
        if refresh_token:
            # Blacklist the token to prevent future use
            token = RefreshToken(refresh_token)
            token.blacklist()
        logger.info(f"Logout successful for user: {request.user.username}")
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception as e:
        # Handle invalid token format or blacklist errors
        logger.error(f"Logout error: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response({
            'error': 'Invalid token',
            'detail': str(e)
        }, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user(request):
    """
    Retrieve currently authenticated user's details.
    
    This endpoint returns the profile information of the currently logged-in user
    based on the JWT token provided in the Authorization header.
    
    Args:
        request: HTTP request with JWT token in Authorization header
    
    Returns:
        Response: JSON containing serialized user data (id, username, email, etc.)
        
    Status Codes:
        - 200: Successfully retrieved user data
        - 401: Unauthorized (invalid or missing token)
        - 500: Server error
    
    Note:
        The user is automatically extracted from the JWT token by Django REST
        Framework's authentication middleware.
    """
    try:
        logger.info(f"Fetching current user: {request.user.username}")
        # Serialize and return current user data
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Current user error: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response({
            'error': 'Failed to fetch user',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================================
# POST MANAGEMENT VIEWS
# ============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def create_post(request):
    """
    Create a new community post.
    
    This endpoint allows authenticated users to create posts with text content,
    optional images, urgency levels, and location information. Posts are
    automatically associated with the authenticated user as the author.
    
    Args:
        request: HTTP request containing post data:
            - content (str): Post text content (required)
            - images (file[]): Array of image files (optional, max 5)
            - urgency (str): Urgency level - 'low', 'medium', 'high', or 'critical'
            - latitude (decimal): Location latitude (optional)
            - longitude (decimal): Location longitude (optional)
            - address (str): Human-readable address (optional)
    
    Returns:
        Response: JSON containing complete serialized post data with author info
        
    Status Codes:
        - 201: Post successfully created
        - 400: Invalid data (validation errors)
        - 401: Unauthorized (not authenticated)
    
    Note:
        Supports multipart/form-data for file uploads and JSON for text-only posts.
    """
    # Pass request context to access authenticated user
    serializer = PostCreateSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        # Save post with authenticated user as author
        post = serializer.save()
        # Return full post details including author information
        response_serializer = PostSerializer(post)
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_posts(request):
    """
    List all posts with optional filtering by urgency, neighborhood, and proximity
    
    Query params:
    - urgency: Filter by urgency level
    - neighborhood: Filter by neighborhood ID
    - nearby: If 'true', filter by coordinates within 3km radius
    - radius: Custom radius in km (default 3)
    """
    # Check if user wants nearby posts based on coordinates
    nearby = request.query_params.get('nearby', '').lower() == 'true'
    
    if nearby:
        radius_km = float(request.query_params.get('radius', 3))
        
        # Get user coordinates from utils
        from .utils import get_user_coordinates, get_posts_by_coordinate_radius
        user_latitude, user_longitude = get_user_coordinates(request.user)
        
        if not user_latitude or not user_longitude:
            return Response({
                'error': 'Coordinates not set in your profile. Please update your profile with your address to see nearby posts.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        logger.info(f"🌐 User {request.user.username} requesting posts within {radius_km}km of ({user_latitude}, {user_longitude})")
        
        # Get posts by coordinate radius
        posts = get_posts_by_coordinate_radius(user_latitude, user_longitude, radius_km)
        
        # Apply additional filters if provided
        urgency = request.query_params.get('urgency', None)
        if urgency:
            posts = [post for post in posts if post.urgency == urgency]
            logger.info(f"🔥 Filtered by urgency: {urgency}")
        
        neighborhood_id = request.query_params.get('neighborhood', None)
        if neighborhood_id:
            posts = [post for post in posts if post.neighborhood_id == int(neighborhood_id)]
            logger.info(f"🏘️  Filtered by neighborhood: {neighborhood_id}")
        
        serializer = PostListSerializer(posts, many=True)
        
        response_data = {
            'user_latitude': str(user_latitude),
            'user_longitude': str(user_longitude),
            'radius_km': radius_km,
            'count': len(posts),
            'posts': serializer.data
        }
        
        logger.info(f"✅ Returning {len(posts)} posts within {radius_km}km")
        
        return Response(response_data, status=status.HTTP_200_OK)
    
    # Default: Get all posts
    posts = Post.objects.all()
    
    # Apply urgency filter if provided
    urgency = request.query_params.get('urgency', None)
    if urgency:
        posts = posts.filter(urgency=urgency)
    
    # Apply neighborhood filter if provided
    neighborhood_id = request.query_params.get('neighborhood', None)
    if neighborhood_id:
        posts = posts.filter(neighborhood_id=neighborhood_id)
    
    # Serialize and return filtered posts
    serializer = PostListSerializer(posts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_post(request, post_id):
    """
    Retrieve detailed information for a specific post.
    
    This endpoint returns complete details for a single post including author
    information, all images, location data, and timestamps.
    
    Args:
        request: HTTP request
        post_id (int): ID of the post to retrieve (from URL path)
    
    Returns:
        Response: JSON containing complete serialized post data
        
    Status Codes:
        - 200: Successfully retrieved post
        - 401: Unauthorized (not authenticated)
        - 404: Post not found
    """
    try:
        # Fetch post by ID
        post = Post.objects.get(id=post_id)
        # Serialize with full details
        serializer = PostSerializer(post)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_post(request, post_id):
    """
    Delete a post (author only).
    
    This endpoint allows users to delete their own posts. Only the post author
    has permission to delete a post. This permanently removes the post and all
    associated data from the database.
    
    Args:
        request: HTTP request from authenticated user
        post_id (int): ID of the post to delete (from URL path)
    
    Returns:
        Response: JSON with success message
        
    Status Codes:
        - 200: Post successfully deleted
        - 401: Unauthorized (not authenticated)
        - 403: Forbidden (user is not the post author)
        - 404: Post not found
    
    Security:
        Enforces author-only deletion to prevent unauthorized post removal.
    """
    try:
        # Fetch the post
        post = Post.objects.get(id=post_id)
        
        # Authorization check: Only author can delete
        if post.author != request.user:
            return Response(
                {'error': 'You do not have permission to delete this post'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Delete post and all related data
        post.delete()
        return Response({'message': 'Post deleted successfully'}, status=status.HTTP_200_OK)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# USER PROFILE VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_profile(request):
    """
    Retrieve the current user's profile information.
    
    This endpoint returns detailed profile information for the authenticated user
    including personal details, location, karma points, and neighborhood association.
    
    Args:
        request: HTTP request from authenticated user
    
    Returns:
        Response: JSON containing complete profile data:
            - bio: User biography
            - location: User location string
            - latitude/longitude: Geographic coordinates
            - karma_points: User's karma/reputation score
            - neighborhood: Associated neighborhood details
            - profile_photo: URL to profile photo (if exists)
            - created_at: Profile creation timestamp
        
    Status Codes:
        - 200: Successfully retrieved profile
        - 401: Unauthorized (not authenticated)
        - 404: Profile not found (shouldn't happen - created on user registration)
    
    Note:
        Profile is automatically created when a user registers via Django signals.
    """
    try:
        # Access profile via one-to-one relationship
        profile = request.user.profile
        # Serialize complete profile data
        serializer = ProfileDetailSerializer(profile)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def update_profile(request):
    """
    Update the current user's profile information.
    
    This endpoint allows users to update their profile details including bio,
    location, profile photo, and neighborhood association. Supports both PUT
    (full update) and PATCH (partial update) methods.
    
    Args:
        request: HTTP request containing updated profile data:
            - bio (str, optional): User biography text
            - location (str, optional): Location description
            - latitude (decimal, optional): Geographic latitude
            - longitude (decimal, optional): Geographic longitude
            - neighborhood (int, optional): Neighborhood ID to associate with
            - profile_photo (file, optional): Profile photo image file
    
    Returns:
        Response: JSON containing complete updated profile data
        
    Status Codes:
        - 200: Profile successfully updated
        - 400: Invalid data (validation errors)
        - 401: Unauthorized (not authenticated)
        - 404: Profile not found
    
    Note:
        Supports multipart/form-data for profile photo uploads and JSON for
        text-only updates. karma_points cannot be updated directly by users.
    """
    try:
        # Access user's profile
        profile = request.user.profile
        # Validate and update profile data (partial=True allows partial updates)
        serializer = ProfileUpdateSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            # Return complete updated profile
            response_serializer = ProfileDetailSerializer(profile)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Profile.DoesNotExist:
        return Response({'error': 'Profile not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_user_posts(request):
    """
    Retrieve all posts created by the current user.
    
    This endpoint returns all posts authored by the authenticated user,
    useful for displaying a user's post history or managing their content.
    
    Args:
        request: HTTP request from authenticated user
    
    Returns:
        Response: JSON array of serialized posts by the current user
        
    Status Codes:
        - 200: Successfully retrieved user's posts
        - 401: Unauthorized (not authenticated)
    
    Note:
        Returns an empty array if the user has no posts.
    """
    # Filter posts by current authenticated user
    posts = Post.objects.filter(author=request.user)
    # Serialize with basic post information
    serializer = PostListSerializer(posts, many=True)
    return Response(serializer.data, status=status.HTTP_200_OK)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_post(request, post_id):
    """
    Update a post (author only).
    
    This endpoint allows users to edit their own posts. Only the post author
    has permission to update. Supports both PUT (full update) and PATCH
    (partial update) methods.
    
    Args:
        request: HTTP request containing updated post data:
            - content (str, optional): Updated post text
            - urgency (str, optional): Updated urgency level
            - latitude (decimal, optional): Updated latitude
            - longitude (decimal, optional): Updated longitude
            - address (str, optional): Updated address
        post_id (int): ID of the post to update (from URL path)
    
    Returns:
        Response: JSON containing complete updated post data
        
    Status Codes:
        - 200: Post successfully updated
        - 400: Invalid data (validation errors)
        - 401: Unauthorized (not authenticated)
        - 403: Forbidden (user is not the post author)
        - 404: Post not found
    
    Note:
        Images cannot be updated through this endpoint. Users should delete
        and create a new post if different images are needed.
    """
    try:
        # Fetch the post
        post = Post.objects.get(id=post_id)
        
        # Authorization check: Only author can update
        if post.author != request.user:
            return Response(
                {'error': 'You do not have permission to edit this post'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Validate and update post data
        serializer = PostUpdateSerializer(post, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            # Return complete updated post
            response_serializer = PostSerializer(post)
            return Response(response_serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except Post.DoesNotExist:
        return Response({'error': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)


# ============================================================================
# NOTIFICATION PREFERENCE VIEWS
# ============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_notification_preferences(request):
    """
    Retrieve the current user's notification preferences.
    
    This endpoint returns the user's notification settings which control when
    and how they receive notifications about community activity.
    
    Args:
        request: HTTP request from authenticated user
    
    Returns:
        Response: JSON containing notification preference settings:
            - email_notifications: Whether to receive email notifications
            - push_notifications: Whether to receive push notifications
            - new_post_alerts: Alert on new posts in neighborhood
            - comment_alerts: Alert on comments to user's posts
            - (other notification settings as defined in model)
        
    Status Codes:
        - 200: Successfully retrieved preferences
        - 401: Unauthorized (not authenticated)
        - 404: Preferences not found (shouldn't happen - created on registration)
    
    Note:
        Notification preferences are automatically created when a user registers.
    """
    try:
        # Access notification preferences via one-to-one relationship
        preferences = request.user.notification_pref
        # Serialize preference data
        serializer = NotificationPreferenceUpdateSerializer(preferences)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except NotificationPreference.DoesNotExist:
        return Response({'error': 'Notification preferences not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_notification_preferences(request):
    """
    Update the current user's notification preferences.
    
    This endpoint allows users to customize their notification settings to
    control which events trigger notifications and through which channels
    (email, push, etc.). Supports both PUT and PATCH methods.
    
    Args:
        request: HTTP request containing updated preference data:
            - email_notifications (bool, optional): Enable/disable email notifications
            - push_notifications (bool, optional): Enable/disable push notifications
            - new_post_alerts (bool, optional): Alert on new neighborhood posts
            - comment_alerts (bool, optional): Alert on comments to user's posts
            - (other notification settings as defined in model)
    
    Returns:
        Response: JSON containing complete updated notification preferences
        
    Status Codes:
        - 200: Preferences successfully updated
        - 400: Invalid data (validation errors)
        - 401: Unauthorized (not authenticated)
        - 404: Preferences not found
    
    Note:
        All fields are optional - send only the fields you want to update.
    """
    try:
        # Access user's notification preferences
        preferences = request.user.notification_pref
        # Validate and update preferences (partial=True allows partial updates)
        serializer = NotificationPreferenceUpdateSerializer(preferences, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    except NotificationPreference.DoesNotExist:
        return Response({'error': 'Notification preferences not found'}, status=status.HTTP_404_NOT_FOUND)




