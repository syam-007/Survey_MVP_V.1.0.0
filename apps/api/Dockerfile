# Use Python 3.11 as base image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Set environment variables for headless operation
ENV MPLBACKEND=Agg
ENV DISPLAY=:99

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    libgl1 \
    libx11-6 \
    libxrender1 \
    libgomp1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxft2 \
    libglx0 \
    libegl1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .

# Expose port 8000
EXPOSE 8000

# Run migrations and start server
CMD python manage.py migrate && python manage.py runserver 0.0.0.0:8000
