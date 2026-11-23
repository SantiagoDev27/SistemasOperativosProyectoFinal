import http from 'k6/http';
import { check } from 'k6';

export default function () {
    const res = http.get('http://localhost/slow?ms=500');
    check(res, {
        'status es 200': (r) => r.status === 200,
    });
}