from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import register, login, logout, current_user

urlpatterns = [
    # Authentication endpoints
    path('auth/register/', register, name='register'),
    path('auth/login/', login, name='login'),
    path('auth/logout/', logout, name='logout'),
    path('auth/user/', current_user, name='current_user'),
    path('auth/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
