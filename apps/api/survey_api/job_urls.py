"""
URL configuration for Job and Master Data endpoints.

Provides routes for:
- Customers
- Clients
- Rigs
- Services
- Wells (enhanced)
- Jobs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from survey_api.views.job_viewset import (
    CustomerViewSet,
    ClientViewSet,
    RigViewSet,
    ServiceViewSet,
    WellViewSet,
    JobViewSet,
)

# Create router
router = DefaultRouter()

# Register master data viewsets
router.register(r'customers', CustomerViewSet, basename='customer')
router.register(r'clients', ClientViewSet, basename='client')
router.register(r'rigs', RigViewSet, basename='rig')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'wells', WellViewSet, basename='well')

# Register job viewset
router.register(r'jobs', JobViewSet, basename='job')

urlpatterns = [
    path('', include(router.urls)),
]
