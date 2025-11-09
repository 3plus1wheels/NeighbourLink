from django.shortcuts import render
from rest_framework import status
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from .serializers import RegisterSerializer, LoginSerializer, UserSerializer
import logging
import traceback

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def register(request):
    """
    Register a new user with email and password
    """
    try:
        logger.info(f"Registration attempt with data: {request.data}")
        serializer = RegisterSerializer(data=request.data)
        
        if serializer.is_valid():
            logger.info("Serializer is valid, creating user...")
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"User created successfully: {user.username}")
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'User registered successfully'
            }, status=status.HTTP_201_CREATED)
        else:
            logger.error(f"Serializer validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
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
    Login with email and password
    """
    try:
        logger.info(f"Login attempt for email: {request.data.get('email')}")
        serializer = LoginSerializer(data=request.data)
        
        if serializer.is_valid():
            user = serializer.validated_data['user']
            refresh = RefreshToken.for_user(user)
            
            logger.info(f"Login successful for user: {user.username}")
            return Response({
                'user': UserSerializer(user).data,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'message': 'Login successful'
            }, status=status.HTTP_200_OK)
        else:
            logger.error(f"Login validation failed: {serializer.errors}")
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
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
    Logout user (blacklist refresh token)
    """
    try:
        refresh_token = request.data.get('refresh')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
        logger.info(f"Logout successful for user: {request.user.username}")
        return Response({'message': 'Logout successful'}, status=status.HTTP_200_OK)
    except Exception as e:
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
    Get current authenticated user details
    """
    try:
        logger.info(f"Fetching current user: {request.user.username}")
        serializer = UserSerializer(request.user)
        return Response(serializer.data, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Current user error: {str(e)}")
        logger.error(f"Full traceback:\n{traceback.format_exc()}")
        return Response({
            'error': 'Failed to fetch user',
            'detail': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


