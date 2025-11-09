from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from .models import (
    Neighborhood, Profile, Post, PostImage, PostReaction,
    Comment, NotificationPreference, Notification
)

User = get_user_model()

# Authentication Serializers
class UserSerializer(serializers.ModelSerializer):
    """Serializer for user details"""
    profile = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'date_joined', 'profile']
        read_only_fields = ['id', 'date_joined']
    
    def get_profile(self, obj):
        from .models import Profile
        try:
            profile = obj.profile
            return {
                'verified': profile.verified,
                'phone_number': profile.phone_number,
                'karma_points': profile.karma_points,
                'street_address': profile.street_address,
                'city': profile.city,
                'state': profile.state,
                'country': profile.country,
                'postal_code': profile.postal_code,
                'latitude': str(profile.latitude) if profile.latitude else None,
                'longitude': str(profile.longitude) if profile.longitude else None,
            }
        except Profile.DoesNotExist:
            return None

class RegisterSerializer(serializers.ModelSerializer):
    """Serializer for user registration"""
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)
    
    # Address fields (optional - not part of User model)
    street_address = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    country = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    postal_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=20)
    latitude = serializers.DecimalField(required=False, allow_null=True, max_digits=10, decimal_places=7)
    longitude = serializers.DecimalField(required=False, allow_null=True, max_digits=10, decimal_places=7)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'street_address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        return attrs

    def create(self, validated_data):
        # Extract address fields
        street_address = validated_data.pop('street_address', '')
        city = validated_data.pop('city', '')
        state = validated_data.pop('state', '')
        country = validated_data.pop('country', '')
        postal_code = validated_data.pop('postal_code', '')
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        validated_data.pop('password2')
        
        # Create user
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password']
        )
        
        # Update profile with address data
        profile = user.profile
        profile.street_address = street_address
        profile.city = city
        profile.state = state
        profile.country = country
        profile.postal_code = postal_code
        profile.latitude = latitude
        profile.longitude = longitude
        profile.save()
        
        return user

class LoginSerializer(serializers.Serializer):
    """Serializer for user login"""
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, required=True)

    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')

        if email and password:
            # Find user by email
            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                raise serializers.ValidationError('Invalid credentials.')
            
            # Authenticate with username (since Django's default auth uses username)
            user = authenticate(username=user.username, password=password)
            
            if not user:
                raise serializers.ValidationError('Invalid credentials.')
            
            if not user.is_active:
                raise serializers.ValidationError('User account is disabled.')
            
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Must include "email" and "password".')

class NeighborhoodSerializer(serializers.ModelSerializer):
    class Meta:
        model = Neighborhood
        fields = '__all__'

class ProfileSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    neighborhood = NeighborhoodSerializer(read_only=True)
    class Meta:
        model = Profile
        fields = ['id', 'user', 'neighborhood', 'verified', 'phone_number', 'karma_points', 
                  'street_address', 'city', 'state', 'country', 'postal_code', 
                  'latitude', 'longitude', 'created_at']

class PostImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = PostImage
        fields = '__all__'

class PostReactionSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    class Meta:
        model = PostReaction
        fields = '__all__'

class CommentSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    class Meta:
        model = Comment
        fields = '__all__'

class PostSerializer(serializers.ModelSerializer):
    author = serializers.StringRelatedField()
    neighborhood = NeighborhoodSerializer(read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    reactions = PostReactionSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    like_count = serializers.SerializerMethodField()
    dislike_count = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'neighborhood', 'title', 'body', 'urgency',
            'comment_count', 'created_at', 'updated_at',
            'images', 'reactions', 'comments', 'like_count', 'dislike_count'
        ]

    def get_like_count(self, obj):
        return obj.like_count()

    def get_dislike_count(self, obj):
        return obj.dislike_count()

class NotificationPreferenceSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    class Meta:
        model = NotificationPreference
        fields = '__all__'

class NotificationSerializer(serializers.ModelSerializer):
    user = serializers.StringRelatedField()
    post = serializers.PrimaryKeyRelatedField(read_only=True)
    class Meta:
        model = Notification
        fields = '__all__'