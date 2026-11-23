import http from 'k6/http';
import { check, sleep } from 'k6';

export default function () {
    const res = http.get('http://localhost/');
    check(res, {
        'status es 200': (r) => r.status === 200,
    });
    sleep(0.1);
}