import requests
import time

BASE = 'http://127.0.0.1:8000'

def post(path, data, token=None):
    headers = {'Content-Type': 'application/json'}
    if token: headers['Authorization'] = f'Bearer {token}'
    return requests.post(BASE + path, json=data, headers=headers)


def test_create_and_maintain_flow():
    username = f'test_{int(time.time())}'
    pwd = 'testpass'
    r = post('/users/', {'username': username, 'password': pwd})
    assert r.status_code == 200

    r = requests.post(BASE + '/auth/token', data={'username': username, 'password': pwd})
    assert r.status_code == 200
    token = r.json()['access_token']

    r = post('/plants/', {'name': 'T1'}, token)
    assert r.status_code == 200
    plant_id = r.json().get('id')

    r = post('/machinery/', {'name': 'M1'}, token)
    assert r.status_code == 200
    mach_id = r.json().get('id')

    today = time.strftime('%Y-%m-%d')
    report = {'date': today, 'plant_id': plant_id, 'machinery_ids': [mach_id], 'horometer_end': 5.0}
    r = post('/reports/', report, token)
    assert r.status_code == 200

    mdata = {'item_type': 'machinery', 'item_id': mach_id, 'hours_at_service': 5.0, 'interval_hours': 30}
    r = post('/maintenances/', mdata, token)
    assert r.status_code == 200

    r = requests.get(BASE + f'/maintenances/last?item_type=machinery&item_id={mach_id}', headers={'Authorization': f'Bearer {token}'})
    assert r.status_code == 200
    j = r.json()
    assert j.get('hours_at_service') == 5.0
