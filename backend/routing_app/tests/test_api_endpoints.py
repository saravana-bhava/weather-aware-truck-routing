"""
Integration tests for Django API endpoints.
"""

from rest_framework.test import APITestCase
from django.urls import reverse
from unittest.mock import patch


class ApiEndpointsTestCase(APITestCase):
    def test_health_check(self):
        url = reverse('health-check')
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data.get('status'), 'healthy')

    def test_geocoding_search_short_query(self):
        url = reverse('geocoding-search')
        response = self.client.get(url, {'q': 'a'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data, [])

    @patch('routing_app.views.requests.get')
    def test_geocoding_search_success(self, mock_get):
        mock_get.return_value.status_code = 200
        mock_get.return_value.json.return_value = {
            "results": [
                {
                    "id": 1,
                    "name": "Chicago",
                    "admin1": "Illinois",
                    "country_code": "US",
                    "latitude": 41.85,
                    "longitude": -87.65,
                }
            ]
        }
        url = reverse('geocoding-search')
        response = self.client.get(url, {'q': 'Chicago'})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['city'], 'Chicago')
        self.assertEqual(response.data[0]['lat'], 41.85)

    def test_calculate_routes_validation(self):
        url = reverse('calculate-routes')
        # Empty payload
        response = self.client.post(url, {}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertIn('origin', response.data)
        self.assertIn('destination', response.data)

    def test_walkthrough_video_endpoints(self):
        response = self.client.get('/walkthrough_demo.mp4')
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'video/mp4')

        response_static = self.client.get('/static/walkthrough_demo.mp4')
        self.assertEqual(response_static.status_code, 200)
        self.assertEqual(response_static['Content-Type'], 'video/mp4')
