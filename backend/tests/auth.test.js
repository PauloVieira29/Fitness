const request = require('supertest');
const app = require('../server'); // note: small demo - not starting server in tests in this scaffold
test('sample', ()=> expect(1+1).toBe(2));
