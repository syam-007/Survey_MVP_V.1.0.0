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
from survey_api.views.upload_viewset import upload_survey_file, delete_survey_file
from survey_api.views.status_viewset import get_survey_status
from survey_api.views.survey_data_viewset import get_survey_data_detail
from survey_api.views.calculation_viewset import CalculationViewSet
from survey_api.views.interpolation_viewset import InterpolationViewSet
from survey_api.views.export_viewset import (
    export_calculated_survey,
    export_interpolated_survey
)
from survey_api.views.reference_viewset import (
    upload_reference_survey,
    list_reference_surveys,
    get_reference_survey_detail
)
from survey_api.views.comparison_viewset import (
    create_comparison,
    get_comparison_detail,
    list_comparisons,
    delete_comparison,
    export_comparison
)
from survey_api.views.adjustment_viewset import (
    apply_offset,
    undo_adjustment,
    redo_adjustment,
    reset_adjustments,
    recalculate_inc_azi,
    get_current_adjustment
)
from survey_api.views.master_data_viewset import (
    HoleSectionMasterViewSet,
    SurveyRunInMasterViewSet,
    MinimumIdMasterViewSet
)
from survey_api.views.extrapolation_viewset import ExtrapolationViewSet
from survey_api.views.duplicate_survey_viewset import DuplicateSurveyViewSet
from survey_api.views.activity_log_viewset import RunActivityLogViewSet

# Initialize DRF router
router = DefaultRouter()
router.register(r'runs', RunViewSet, basename='run')
router.register(r'wells', WellViewSet, basename='well')
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'depths', DepthViewSet, basename='depth')
router.register(r'surveys', SurveyViewSet, basename='survey')
router.register(r'tieons', TieOnViewSet, basename='tieon')
router.register(r'calculations', CalculationViewSet, basename='calculation')
router.register(r'interpolations', InterpolationViewSet, basename='interpolation')
router.register(r'hole-sections', HoleSectionMasterViewSet, basename='hole-section')
router.register(r'survey-run-ins', SurveyRunInMasterViewSet, basename='survey-run-in')
router.register(r'minimum-ids', MinimumIdMasterViewSet, basename='minimum-id')
router.register(r'extrapolations', ExtrapolationViewSet, basename='extrapolation')
router.register(r'duplicate-surveys', DuplicateSurveyViewSet, basename='duplicate-survey')
router.register(r'activity-logs', RunActivityLogViewSet, basename='activity-log')

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

    # Survey file upload endpoint
    path("api/v1/surveys/upload/", upload_survey_file, name="upload_survey_file"),

    # Survey file delete endpoint
    path("api/v1/surveys/files/<uuid:file_id>/delete/", delete_survey_file, name="delete_survey_file"),

    # Survey status endpoint
    path("api/v1/surveys/status/<uuid:survey_data_id>/", get_survey_status, name="get_survey_status"),

    # Survey data detail endpoint
    path("api/v1/surveys/<uuid:survey_data_id>/", get_survey_data_detail, name="get_survey_data_detail"),

    # Survey export endpoints
    path("api/v1/surveys/export/calculated/<uuid:calculated_survey_id>/",
         export_calculated_survey,
         name="export-calculated-survey"),
    path("api/v1/surveys/export/interpolated/<uuid:interpolated_survey_id>/",
         export_interpolated_survey,
         name="export-interpolated-survey"),

    # Reference Survey endpoints
    path("api/v1/surveys/reference/upload/",
         upload_reference_survey,
         name="upload-reference-survey"),
    path("api/v1/surveys/reference/",
         list_reference_surveys,
         name="list-reference-surveys"),
    path("api/v1/surveys/reference/<uuid:id>/",
         get_reference_survey_detail,
         name="get-reference-survey-detail"),

    # Comparison endpoints
    path("api/v1/comparisons/",
         create_comparison,
         name="create-comparison"),
    path("api/v1/comparisons/list/",
         list_comparisons,
         name="list-comparisons"),
    path("api/v1/comparisons/<uuid:comparison_id>/",
         get_comparison_detail,
         name="get-comparison-detail"),
    path("api/v1/comparisons/<uuid:comparison_id>/delete/",
         delete_comparison,
         name="delete-comparison"),
    path("api/v1/comparisons/<uuid:comparison_id>/export/",
         export_comparison,
         name="export-comparison"),

    # Adjustment endpoints
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/current/",
         get_current_adjustment,
         name="get-current-adjustment"),
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/apply/",
         apply_offset,
         name="apply-offset"),
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/undo/",
         undo_adjustment,
         name="undo-adjustment"),
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/redo/",
         redo_adjustment,
         name="redo-adjustment"),
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/reset/",
         reset_adjustments,
         name="reset-adjustments"),
    path("api/v1/comparisons/<uuid:comparison_id>/adjustment/recalculate/",
         recalculate_inc_azi,
         name="recalculate-inc-azi"),

    # Run and Well management endpoints (via router)
    path("api/v1/", include(router.urls)),
]
