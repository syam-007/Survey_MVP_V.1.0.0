"""
URL configuration for survey_api project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""

from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from survey_api.views.auth_views import (
    register_view,
    login_view,
    logout_view,
    me_view
)
from survey_api.views.user_views import (
    list_users,
    get_user,
    update_user,
    delete_user
)
from survey_api.views.run_viewset import RunViewSet
from survey_api.views.well_viewset import WellViewSet
from survey_api.views.location_viewset import LocationViewSet
from survey_api.views.depth_viewset import DepthViewSet
from survey_api.views.survey_viewset import SurveyViewSet
from survey_api.views.tieon_viewset import TieOnViewSet

# Initialize DRF router
router = DefaultRouter()
router.register(r'runs', RunViewSet, basename='run')
router.register(r'wells', WellViewSet, basename='well')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'depths', DepthViewSet, basename='depth')
router.register(r'surveys', SurveyViewSet, basename='survey')
router.register(r'tieons', TieOnViewSet, basename='tieon')

urlpatterns = [
    path("admin/", admin.site.urls),

    # Authentication endpoints
    path("api/v1/auth/register", register_view, name="auth_register"),
    path("api/v1/auth/login", login_view, name="auth_login"),
    path("api/v1/auth/logout", logout_view, name="auth_logout"),
    path("api/v1/auth/refresh", TokenRefreshView.as_view(), name="auth_refresh"),
    path("api/v1/auth/me", me_view, name="auth_me"),

    # User management endpoints (Admin only)
    path("api/v1/users", list_users, name="users_list"),
    path("api/v1/users/<uuid:user_id>", get_user, name="users_get"),
    path("api/v1/users/<uuid:user_id>/update", update_user, name="users_update"),
    path("api/v1/users/<uuid:user_id>/delete", delete_user, name="users_delete"),

    # Run and Well management endpoints (via router)
    path("api/v1/", include(router.urls)),
]
