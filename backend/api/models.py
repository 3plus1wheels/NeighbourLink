from django.conf import settings
from django.core.validators import RegexValidator
from django.db import models
from django.utils import timezone
from django.dispatch import receiver
from django.db.models.signals import post_save
from django.contrib.auth import get_user_model

User = get_user_model()

class Neighborhood(models.Model):
    name = models.CharField(max_length=200, unique=True)
    city = models.CharField(max_length=100)
    country = models.CharField(max_length=100)
    zip_code = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return self.name

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    neighborhood = models.ForeignKey(
        Neighborhood, null=True, blank=True, on_delete=models.SET_NULL, related_name="residents"
    )
    verified = models.BooleanField(default=False)
    phone_number = models.CharField(
        max_length=20,
        blank=True,
        validators=[RegexValidator(r'^\+?[0-9\-\s]+$', 'Enter a valid phone number.')],
        unique=True,
    )
    karma_points = models.IntegerField(default=0)
    
    # Address fields
    street_address = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    country = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def save(self, *args, **kwargs):
        """Round coordinates to 7 decimal places before saving (Google Maps can return 15+ decimals)"""
        from decimal import Decimal, ROUND_HALF_UP
        
        if self.latitude is not None:
            self.latitude = Decimal(str(self.latitude)).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        if self.longitude is not None:
            self.longitude = Decimal(str(self.longitude)).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Profile({self.user.username})"

# create Profile automatically when a user is created   
@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        Profile.objects.create(user=instance)


class Post(models.Model):
    URGENCY_LOW = "low"
    URGENCY_MED = "med"
    URGENCY_HIGH = "high"
    URGENCY_CHOICES = [
        (URGENCY_LOW, "Low"),
        (URGENCY_MED, "Medium"),
        (URGENCY_HIGH, "High"),
    ]
    author = models.ForeignKey(User, on_delete=models.CASCADE, related_name="posts")
    neighborhood = models.ForeignKey(Neighborhood, on_delete=models.CASCADE, null=True, blank=True, related_name="posts")
    title = models.CharField(max_length=200, null=False, blank=False)
    body = models.TextField(blank=True)
    urgency = models.CharField(max_length=4, choices=URGENCY_CHOICES, default=URGENCY_LOW)
    comment_count = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    postal_code = models.CharField(max_length=20, blank=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def save(self, *args, **kwargs):
        """Round coordinates to 7 decimal places before saving (Google Maps can return 15+ decimals)"""
        from decimal import Decimal, ROUND_HALF_UP
        
        if self.latitude is not None:
            self.latitude = Decimal(str(self.latitude)).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        if self.longitude is not None:
            self.longitude = Decimal(str(self.longitude)).quantize(Decimal('0.0000001'), rounding=ROUND_HALF_UP)
        
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} ({self.urgency})"

    def add_comment(self, author, body):
        c = Comment.objects.create(post=self, author=author, body=body)
        self.comment_count = Comment.objects.filter(post=self).count()
        self.save(update_fields=['comment_count'])
        return c
    
    def upvote_count(self):
        return self.reactions.filter(reaction=PostReaction.UPVOTE).count()

    def downvote_count(self):
        return self.reactions.filter(reaction=PostReaction.DOWNVOTE).count()
    
    def vote_score(self):
        """Net score: upvotes minus downvotes"""
        return self.upvote_count() - self.downvote_count()

class PostImage(models.Model):
    """
    Separate image model allows multiple images per post and ordering.
    MEDIA configuration required in settings.py (MEDIA_ROOT, MEDIA_URL).
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="images")
    image = models.ImageField(upload_to='post_images/%Y/%m/%d/')
    caption = models.CharField(max_length=200, blank=True)
    order = models.PositiveIntegerField(default=0)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'uploaded_at']

    def __str__(self):
        return f"Image for {self.post.id} ({self.image.name})"

class PostReaction(models.Model):
    UPVOTE = "upvote"
    DOWNVOTE = "downvote"
    REACTION_CHOICES = [
        (UPVOTE, "Upvote"),
        (DOWNVOTE, "Downvote"),
    ]
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="reactions")
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="post_reactions")
    reaction = models.CharField(max_length=8, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def __str__(self):
        return f"{self.user.username} {self.reaction} Post({self.post.id})"

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name="comments")
    author = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name="comments")
    body = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_hidden = models.BooleanField(default=False)  # moderation

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Comment by {self.author} on {self.post_id}"

class NotificationPreference(models.Model):
    """
    Stores a user's preference for notifications in-app / SMS / Email.
    min_urgency determines the minimum post urgency they'll get notified about.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='notification_pref')
    min_urgency = models.CharField(max_length=4, choices=Post.URGENCY_CHOICES, default=Post.URGENCY_LOW)
    sms_enabled = models.BooleanField(default=False)
    email_enabled = models.BooleanField(default=True)

    def __str__(self):
        return f"NotifPref({self.user.username})"


@receiver(post_save, sender=User)
def create_user_notification_pref(sender, instance, created, **kwargs):
    if created:
        NotificationPreference.objects.create(user=instance)


class Notification(models.Model):
    """
    In-app notification. For SMS, you may create a separate SMSLog model.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="notifications")
    post = models.ForeignKey(Post, null=True, blank=True, on_delete=models.SET_NULL)
    message = models.TextField()
    seen = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    delivered_via_sms = models.BooleanField(default=False)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Notif({self.user.username}): {self.message[:40]}"


