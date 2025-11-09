"""
Serializers for Job and Master Data models.

Includes serializers for:
- Customer
- Client
- Rig
- Service
- Well (enhanced)
- Job
"""
from rest_framework import serializers
from survey_api.models import Customer, Client, Rig, Service, Well, Job
from .location_serializers import LocationSerializer


# =======================
# Customer Serializers
# =======================

class CustomerSerializer(serializers.ModelSerializer):
    """Serializer for Customer model."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id',
            'customer_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CustomerListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Customer list views."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id',
            'customer_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CreateCustomerSerializer(serializers.ModelSerializer):
    """Serializer for creating Customer."""

    class Meta:
        model = Customer
        fields = [
            'customer_name',
        ]

    def create(self, validated_data):
        """Create customer with current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# =======================
# Client Serializers
# =======================

class ClientSerializer(serializers.ModelSerializer):
    """Serializer for Client model."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id',
            'client_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class ClientListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Client list views."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Client
        fields = [
            'id',
            'client_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CreateClientSerializer(serializers.ModelSerializer):
    """Serializer for creating Client."""

    class Meta:
        model = Client
        fields = [
            'client_name',
        ]

    def create(self, validated_data):
        """Create client with current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# =======================
# Rig Serializers
# =======================

class RigSerializer(serializers.ModelSerializer):
    """Serializer for Rig model."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Rig
        fields = [
            'id',
            'rig_id',
            'rig_number',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class RigListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Rig list views."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Rig
        fields = [
            'id',
            'rig_id',
            'rig_number',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CreateRigSerializer(serializers.ModelSerializer):
    """Serializer for creating Rig."""

    class Meta:
        model = Rig
        fields = [
            'rig_id',
            'rig_number',
        ]

    def create(self, validated_data):
        """Create rig with current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# =======================
# Service Serializers
# =======================

class ServiceSerializer(serializers.ModelSerializer):
    """Serializer for Service model."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id',
            'service_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class ServiceListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Service list views."""

    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Service
        fields = [
            'id',
            'service_name',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CreateServiceSerializer(serializers.ModelSerializer):
    """Serializer for creating Service."""

    class Meta:
        model = Service
        fields = [
            'service_name',
        ]

    def create(self, validated_data):
        """Create service with current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


# =======================
# Enhanced Well Serializers
# =======================

class WellSerializer(serializers.ModelSerializer):
    """Serializer for Well model."""

    location = LocationSerializer(read_only=True)
    job_count = serializers.IntegerField(read_only=True)
    has_location = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = [
            'id',
            'well_name',
            'well_id',
            'location',
            'job_count',
            'has_location',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'job_count', 'has_location']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class WellListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Well list views."""

    job_count = serializers.IntegerField(read_only=True)
    has_location = serializers.BooleanField(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    class Meta:
        model = Well
        fields = [
            'id',
            'well_name',
            'well_id',
            'job_count',
            'has_location',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = fields

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class CreateLocationForWellSerializer(serializers.Serializer):
    """Serializer for location data when creating a well."""
    latitude = serializers.DecimalField(max_digits=10, decimal_places=8, required=False, allow_null=True)
    longitude = serializers.DecimalField(max_digits=11, decimal_places=8, required=False, allow_null=True)
    latitude_degrees = serializers.IntegerField(required=False, allow_null=True)
    latitude_minutes = serializers.IntegerField(required=False, allow_null=True)
    latitude_seconds = serializers.DecimalField(max_digits=5, decimal_places=3, required=False, allow_null=True)
    longitude_degrees = serializers.IntegerField(required=False, allow_null=True)
    longitude_minutes = serializers.IntegerField(required=False, allow_null=True)
    longitude_seconds = serializers.DecimalField(max_digits=5, decimal_places=3, required=False, allow_null=True)
    easting = serializers.DecimalField(max_digits=12, decimal_places=3, required=False, allow_null=True)
    northing = serializers.DecimalField(max_digits=12, decimal_places=3, required=False, allow_null=True)
    geodetic_datum = serializers.CharField(max_length=100, default='PSD 93')
    geodetic_system = serializers.CharField(max_length=100, default='Universal Transverse Mercator')
    map_zone = serializers.CharField(max_length=50, default='Zone 40N(54E to 60E)')
    north_reference = serializers.ChoiceField(
        choices=[('True North', 'True North'), ('Grid North', 'Grid North'), ('Magnetic North', 'Magnetic North')],
        default='Grid North'
    )
    central_meridian = serializers.DecimalField(max_digits=8, decimal_places=3, default=0.0)


class CreateWellSerializer(serializers.ModelSerializer):
    """Serializer for creating Well with Location."""

    location = CreateLocationForWellSerializer(required=True)

    class Meta:
        model = Well
        fields = [
            'well_name',
            'well_id',
            'location',
        ]

    def create(self, validated_data):
        """Create well with location and current user."""
        from survey_api.models import Location
        from survey_api.services.location_service import LocationService

        location_data = validated_data.pop('location')
        request = self.context.get('request')

        # Create well
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        well = Well.objects.create(**validated_data)

        # Calculate location fields using LocationService
        data_with_calculations = LocationService.create_location_with_calculations(location_data)

        # Create location for well
        Location.objects.create(well=well, **data_with_calculations)

        return well


# =======================
# Job Serializers
# =======================

class JobSerializer(serializers.ModelSerializer):
    """Detailed serializer for Job model."""

    customer_name = serializers.CharField(source='customer.customer_name', read_only=True)
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    well_name = serializers.CharField(source='well.well_name', read_only=True)
    well_id_number = serializers.CharField(source='well.well_id', read_only=True)
    rig_id = serializers.CharField(source='rig.rig_id', read_only=True)
    rig_number = serializers.CharField(source='rig.rig_number', read_only=True)
    service_name = serializers.CharField(source='service.service_name', read_only=True)
    run_count = serializers.IntegerField(read_only=True)
    duration_days = serializers.IntegerField(read_only=True)
    is_active = serializers.BooleanField(read_only=True)
    location = LocationSerializer(read_only=True)
    created_by_name = serializers.SerializerMethodField()

    # Nested objects for detail view
    customer = CustomerSerializer(read_only=True)
    client = ClientSerializer(read_only=True)
    well = WellSerializer(read_only=True)
    rig = RigSerializer(read_only=True)
    service = ServiceSerializer(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id',
            'job_number',
            'customer',
            'customer_name',
            'client',
            'client_name',
            'well',
            'well_name',
            'well_id_number',
            'rig',
            'rig_id',
            'rig_number',
            'service',
            'service_name',
            'start_date',
            'end_date',
            'status',
            'description',
            'run_count',
            'duration_days',
            'is_active',
            'location',
            'created_at',
            'updated_at',
            'created_by',
            'created_by_name',
        ]
        read_only_fields = ['id', 'job_number', 'start_date', 'end_date', 'created_at', 'updated_at', 'created_by', 'run_count', 'duration_days', 'is_active', 'location']

    def get_created_by_name(self, obj):
        """Get created by user name."""
        if obj.created_by:
            return obj.created_by.username
        return None


class JobListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for Job list views."""

    customer_name = serializers.CharField(source='customer.customer_name', read_only=True)
    client_name = serializers.CharField(source='client.client_name', read_only=True)
    well_name = serializers.CharField(source='well.well_name', read_only=True)
    well_id_number = serializers.CharField(source='well.well_id', read_only=True)
    rig_id = serializers.CharField(source='rig.rig_id', read_only=True)
    service_name = serializers.CharField(source='service.service_name', read_only=True)
    run_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = Job
        fields = [
            'id',
            'job_number',
            'customer_name',
            'client_name',
            'well_name',
            'well_id_number',
            'rig_id',
            'service_name',
            'start_date',
            'end_date',
            'status',
            'run_count',
            'created_at',
        ]
        read_only_fields = fields


class CreateJobSerializer(serializers.ModelSerializer):
    """Serializer for creating Job."""

    class Meta:
        model = Job
        fields = [
            'id',
            'job_number',
            'customer',
            'client',
            'well',
            'rig',
            'service',
            'status',
            'description',
            'created_at',
        ]
        read_only_fields = ['id', 'job_number', 'created_at']

    def validate(self, data):
        """Validate job data."""
        # Validate date range
        if 'start_date' in data and 'end_date' in data and data['start_date'] and data['end_date']:
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'End date cannot be before start date'
                })

        return data

    def create(self, validated_data):
        """Create job with current user."""
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class UpdateJobSerializer(serializers.ModelSerializer):
    """Serializer for updating Job."""

    class Meta:
        model = Job
        fields = [
            'customer',
            'client',
            'well',
            'rig',
            'service',
            'status',
            'description',
        ]

    def validate(self, data):
        """Validate job update data."""
        # Get current instance
        instance = self.instance

        # Get dates (use existing if not provided)
        start_date = data.get('start_date', instance.start_date if instance else None)
        end_date = data.get('end_date', instance.end_date if instance else None)

        # Validate date range
        if start_date and end_date:
            if end_date < start_date:
                raise serializers.ValidationError({
                    'end_date': 'End date cannot be before start date'
                })

        return data
