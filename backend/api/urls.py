from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register, login, logout, current_user,
    create_post, list_posts, get_post, delete_post, update_post,
    get_profile, update_profile, get_user_posts,
    get_notification_preferences, update_notification_preferences
)

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/user/', current_user, name='current_user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # Post endpoints
    path('posts/', list_posts, name='list_posts'),
    path('posts/create/', create_post, name='create_post'),
    path('posts/<int:post_id>/', get_post, name='get_post'),
    path('posts/<int:post_id>/update/', update_post, name='update_post'),
    path('posts/<int:post_id>/delete/', delete_post, name='delete_post'),
    
    # Profile endpoints
    path('profile/', get_profile, name='get_profile'),
    path('profile/update/', update_profile, name='update_profile'),
    path('profile/posts/', get_user_posts, name='get_user_posts'),
    
    # Notification preferences
    path('notifications/preferences/', get_notification_preferences, name='get_notification_preferences'),
    path('notifications/preferences/update/', update_notification_preferences, name='update_notification_preferences'),
]
