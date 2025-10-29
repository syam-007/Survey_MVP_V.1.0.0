import requests
import json

# Get run detail
url = "http://localhost:8000/api/v1/runs/964376fd-126b-4f84-af7f-493cea1e645a/"

# Try to get token from temp file, otherwise just make request without auth
try:
    with open('temp_response.json', 'r') as f:
        data = json.load(f)
        token = data.get('access')
        headers = {'Authorization': f'Bearer {token}'}
except:
    headers = {}

response = requests.get(url, headers=headers)
print(json.dumps(response.json(), indent=2))
