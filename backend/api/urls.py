from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    register, login, logout, current_user,
    create_post, list_posts, get_post, delete_post
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
    path('posts/<int:post_id>/delete/', delete_post, name='delete_post'),
]
