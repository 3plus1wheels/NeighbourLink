from rest_framework import serializers
from django.contrib.auth import get_user_model, authenticate
from django.contrib.auth.password_validation import validate_password
from django.db import models as django_models
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
    
    # Phone number field
    phone_number = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=20)
    
    # Address fields (optional - not part of User model)
    street_address = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=255)
    city = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    state = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    country = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=100)
    postal_code = serializers.CharField(required=False, allow_blank=True, allow_null=True, max_length=20)
    # Use FloatField to accept any precision, then round in validation
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'password2', 'phone_number', 'street_address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']
        extra_kwargs = {
            'email': {'required': True},
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Password fields didn't match."})
        
        # Check if email already exists
        if User.objects.filter(email=attrs['email']).exists():
            raise serializers.ValidationError({"email": "A user with this email already exists."})
        
        # Round coordinates if provided (Google Maps can return 15+ decimal places)
        if attrs.get('latitude') is not None:
            from decimal import Decimal, ROUND_HALF_UP
            attrs['latitude'] = Decimal(str(attrs['latitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        if attrs.get('longitude') is not None:
            from decimal import Decimal, ROUND_HALF_UP
            attrs['longitude'] = Decimal(str(attrs['longitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        return attrs

    def create(self, validated_data):
        # Extract profile fields
        phone_number = validated_data.pop('phone_number', '')
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
        
        # Update profile with all data
        profile = user.profile
        profile.phone_number = phone_number
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
    image = serializers.SerializerMethodField()
    
    class Meta:
        model = PostImage
        fields = ['id', 'post', 'image', 'caption', 'order', 'uploaded_at']
    
    def get_image(self, obj):
        """Return the image URL path"""
        if obj.image:
            return obj.image.url
        return None

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
    author_karma = serializers.IntegerField(source='author.profile.karma_points', read_only=True)
    neighborhood = NeighborhoodSerializer(read_only=True)
    images = PostImageSerializer(many=True, read_only=True)
    reactions = PostReactionSerializer(many=True, read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    upvote_count = serializers.SerializerMethodField()
    downvote_count = serializers.SerializerMethodField()
    vote_score = serializers.SerializerMethodField()
    postal_code = serializers.CharField()

    class Meta:
        model = Post
        fields = [
            'id', 'author', 'author_karma', 'neighborhood', 'title', 'body', 'urgency',
            'comment_count', 'created_at', 'updated_at',
            'images', 'reactions', 'comments', 'upvote_count', 'downvote_count', 'vote_score',
            'postal_code', 'latitude', 'longitude'
        ]

    def get_upvote_count(self, obj):
        return obj.upvote_count()

    def get_downvote_count(self, obj):
        return obj.downvote_count()
    
    def get_vote_score(self, obj):
        return obj.vote_score()

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

# Post Creation Serializers
class PostCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating posts with location and urgency"""
    images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    location = serializers.CharField(max_length=500, required=False, allow_blank=True)
    neighborhood_id = serializers.IntegerField(required=False, allow_null=True)
    postal_code = serializers.CharField(max_length=20, required=False, allow_blank=True)
    # Use FloatField to accept any precision, then round in validation
    latitude = serializers.FloatField(required=False, allow_null=True)
    longitude = serializers.FloatField(required=False, allow_null=True)

    class Meta:
        model = Post
        fields = ['title', 'body', 'urgency', 'location', 'neighborhood_id', 'images', 'postal_code', 'latitude', 'longitude']
    
    def validate(self, attrs):
        """Round coordinates to 7 decimal places if provided (Google Maps can return 15+ decimals)"""
        from decimal import Decimal, ROUND_HALF_UP
        
        if attrs.get('latitude') is not None:
            attrs['latitude'] = Decimal(str(attrs['latitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        if attrs.get('longitude') is not None:
            attrs['longitude'] = Decimal(str(attrs['longitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        return attrs
    
    def create(self, validated_data):
        images_data = validated_data.pop('images', [])
        location = validated_data.pop('location', '')
        neighborhood_id = validated_data.pop('neighborhood_id', None)
        postal_code = validated_data.pop('postal_code', '')
        latitude = validated_data.pop('latitude', None)
        longitude = validated_data.pop('longitude', None)
        
        # Get the author from context (current user)
        author = self.context['request'].user
        
        # Get neighborhood if provided
        neighborhood = None
        if neighborhood_id:
            try:
                neighborhood = Neighborhood.objects.get(id=neighborhood_id)
            except Neighborhood.DoesNotExist:
                pass
        
        # If no neighborhood provided, try to get from user's profile
        if not neighborhood and hasattr(author, 'profile') and author.profile.neighborhood:
            neighborhood = author.profile.neighborhood
        
        # Create the post with coordinates
        post = Post.objects.create(
            author=author,
            neighborhood=neighborhood,
            postal_code=postal_code,
            latitude=latitude,
            longitude=longitude,
            **validated_data
        )
        
        # Save location as part of the body or create a separate location field if needed
        if location:
            post.body = f"{post.body}\n\n📍 Location: {location}" if post.body else f"📍 Location: {location}"
            post.save()
        
        # Create post images
        for index, image_data in enumerate(images_data):
            PostImage.objects.create(
                post=post,
                image=image_data,
                order=index
            )
        
        return post

class PostListSerializer(serializers.ModelSerializer):
    """Serializer for listing posts with minimal data"""
    author_username = serializers.CharField(source='author.username', read_only=True)
    author_karma = serializers.IntegerField(source='author.profile.karma_points', read_only=True)
    neighborhood_name = serializers.CharField(source='neighborhood.name', read_only=True, allow_null=True)
    images = PostImageSerializer(many=True, read_only=True)
    upvote_count = serializers.SerializerMethodField()
    downvote_count = serializers.SerializerMethodField()
    vote_score = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = Post
        fields = [
            'id', 'title', 'body', 'urgency', 'author_username', 'author_karma',
            'neighborhood_name', 'comment_count', 'created_at', 
             'updated_at', 'images', 'upvote_count', 'downvote_count', 'vote_score', 'user_vote',
            'postal_code', 'latitude', 'longitude'
        ]
    
    def get_upvote_count(self, obj):
        return obj.upvote_count()
    
    def get_downvote_count(self, obj):
        return obj.downvote_count()
    
    def get_vote_score(self, obj):
        return obj.vote_score()
    
    def get_user_vote(self, obj):
        """Get the current user's vote on this post"""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            reaction = obj.reactions.filter(user=request.user).first()
            return reaction.reaction if reaction else None
        return None

# Profile Management Serializers
class ProfileDetailSerializer(serializers.ModelSerializer):
    """Detailed profile information"""
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    neighborhood_name = serializers.CharField(source='neighborhood.name', read_only=True, allow_null=True)
    post_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    member_since = serializers.DateTimeField(source='created_at', read_only=True)
    
    class Meta:
        model = Profile
        fields = [
            'id', 'username', 'email', 'phone_number',
            'verified', 'karma_points', 'neighborhood_name',
            'street_address', 'city', 'state', 'country', 'postal_code',
            'latitude', 'longitude',
            'post_count', 'comment_count', 'member_since', 'updated_at'
        ]
        read_only_fields = ['verified', 'karma_points']
    
    def get_post_count(self, obj):
        return obj.user.posts.count()
    
    def get_comment_count(self, obj):
        return obj.user.comments.count()

class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating profile"""
    email = serializers.EmailField(write_only=True, required=False)
    
    class Meta:
        model = Profile
        fields = ['phone_number', 'email', 'street_address', 'city', 'state', 'country', 'postal_code', 'latitude', 'longitude']
    
    def validate(self, attrs):
        """Round coordinates to 7 decimal places if provided (Google Maps can return 15+ decimals)"""
        from decimal import Decimal, ROUND_HALF_UP
        
        if attrs.get('latitude') is not None:
            attrs['latitude'] = Decimal(str(attrs['latitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        if attrs.get('longitude') is not None:
            attrs['longitude'] = Decimal(str(attrs['longitude'])).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        return attrs
    
    def update(self, instance, validated_data):
        # Handle email update separately (on User model)
        email = validated_data.pop('email', None)
        if email:
            instance.user.email = email
            instance.user.save()
        
        # Update profile fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance

class NotificationPreferenceUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating notification preferences"""
    class Meta:
        model = NotificationPreference
        fields = ['min_urgency', 'sms_enabled', 'email_enabled']
    
    def validate_min_urgency(self, value):
        if value not in ['low', 'med', 'high']:
            raise serializers.ValidationError("Invalid urgency level")
        return value

class PostUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating posts with image management"""
    new_images = serializers.ListField(
        child=serializers.ImageField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    remove_image_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=False,
        allow_empty=True
    )
    
    class Meta:
        model = Post
        fields = ['title', 'body', 'urgency', 'new_images', 'remove_image_ids']
    
    def validate(self, attrs):
        # Ensure only the author can update
        request = self.context.get('request')
        if request and self.instance.author != request.user:
            raise serializers.ValidationError("You can only edit your own posts")
        
        # Validate total image count after changes
        new_images = attrs.get('new_images', [])
        remove_image_ids = attrs.get('remove_image_ids', [])
        
        current_image_count = self.instance.images.count()
        final_count = current_image_count - len(remove_image_ids) + len(new_images)
        
        if final_count > 5:
            raise serializers.ValidationError({
                'new_images': f'Cannot add {len(new_images)} images. Post would have {final_count} images (max: 5).'
            })
        
        return attrs
    
    def update(self, instance, validated_data):
        # Handle image removal
        remove_image_ids = validated_data.pop('remove_image_ids', [])
        if remove_image_ids:
            images_to_remove = instance.images.filter(id__in=remove_image_ids)
            for img in images_to_remove:
                img.image.delete(save=False)  # Delete the actual file
                img.delete()  # Delete the database record
        
        # Handle new images
        new_images = validated_data.pop('new_images', [])
        if new_images:
            current_max_order = instance.images.aggregate(django_models.Max('order'))['order__max'] or 0
            for index, image_data in enumerate(new_images):
                PostImage.objects.create(
                    post=instance,
                    image=image_data,
                    order=current_max_order + index + 1
                )
        
        # Update other fields
        return super().update(instance, validated_data)
