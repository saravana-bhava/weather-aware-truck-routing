"""
Main URL configuration for weather-aware-truck-routing project.
"""

from pathlib import Path
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.generic import TemplateView
from django.conf import settings
from django.http import HttpResponse, FileResponse, Http404

def video_walkthrough_view(request):
    candidates = [
        settings.BASE_DIR / 'walkthrough_demo.mp4',
        settings.BASE_DIR.parent / 'walkthrough_demo.mp4',
        settings.STATIC_ROOT / 'walkthrough_demo.mp4',
        settings.FRONTEND_DIR / 'walkthrough_demo.mp4',
        Path('/app/backend/walkthrough_demo.mp4'),
        Path('/app/walkthrough_demo.mp4'),
    ]
    for p in candidates:
        if p.exists():
            return FileResponse(open(p, 'rb'), content_type='video/mp4')
    raise Http404("Walkthrough video not found.")

def frontend_view(request):
    index_file = settings.FRONTEND_DIR / 'index.html'
    if index_file.exists():
        with open(index_file, 'r', encoding='utf-8') as f:
            resp = HttpResponse(f.read(), content_type='text/html')
            resp['Cache-Control'] = 'no-cache, no-store, must-revalidate'
            resp['Pragma'] = 'no-cache'
            resp['Expires'] = '0'
            return resp
    return HttpResponse(
        '<h1>Weather-Aware Truck Routing API</h1><p>Visit <a href="/api/health/">/api/health/</a> or start Vite frontend.</p>',
        content_type='text/html'
    )

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('routing_app.urls')),
    path('walkthrough_demo.mp4', video_walkthrough_view, name='walkthrough_video'),
    path('static/walkthrough_demo.mp4', video_walkthrough_view, name='walkthrough_video_static'),
    re_path(r'^(?!api/|admin/|static/|walkthrough_demo\.mp4).*$', frontend_view, name='frontend'),
]
