from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from decouple import config

User = get_user_model()


class Command(BaseCommand):
    help = 'Creates an admin user if one does not exist'

    def add_arguments(self, parser):
        parser.add_argument(
            '--username',
            type=str,
            default=config('ADMIN_USERNAME', default='admin'),
            help='Admin username (default: from ADMIN_USERNAME env or "admin")'
        )
        parser.add_argument(
            '--email',
            type=str,
            default=config('ADMIN_EMAIL', default='admin@example.com'),
            help='Admin email (default: from ADMIN_EMAIL env or "admin@example.com")'
        )
        parser.add_argument(
            '--password',
            type=str,
            default=config('ADMIN_PASSWORD', default='admin123'),
            help='Admin password (default: from ADMIN_PASSWORD env or "admin123")'
        )

    def handle(self, *args, **options):
        username = options['username']
        email = options['email']
        password = options['password']

        # Check if admin user already exists
        if User.objects.filter(username=username).exists():
            self.stdout.write(
                self.style.WARNING(f'Admin user "{username}" already exists')
            )
            return

        # Check if email is already used
        if User.objects.filter(email=email).exists():
            self.stdout.write(
                self.style.ERROR(f'Email "{email}" is already in use by another user')
            )
            return

        try:
            # Create admin user
            admin_user = User.objects.create_user(
                username=username,
                email=email,
                password=password,
                role='Admin',
                first_name='System',
                last_name='Administrator',
                is_staff=True,
                is_superuser=True
            )

            self.stdout.write(
                self.style.SUCCESS(
                    f'Successfully created admin user: {username} ({email})'
                )
            )
            self.stdout.write(
                self.style.WARNING(
                    'IMPORTANT: Change the admin password after first login!'
                )
            )

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Error creating admin user: {str(e)}')
            )
