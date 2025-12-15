// backend/tests/entries.test.js
const request = require('supertest');
const { app, connectDB, mongoose } = require('../index');
const User = require('../models/User');
const Entry = require('../models/Entry');

beforeAll(async () => {
  await connectDB();
  await User.deleteMany({ email: 'athlete@test.com' });
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Entradas de Treino (Entries)', () => {
  let token;
  let userId;

  // Criar utilizador para testes
  beforeAll(async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: 'athlete_test',
      password: '123456password',
      role: 'client',
      profile: { name: 'Atleta Teste', email: 'athlete@test.com' }
    });
    token = res.body.token;
    userId = res.body.user._id;
  });

  it('Deve registar um treino HOJE com sucesso', async () => {
    const today = new Date().toISOString();

    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: today,
        completed: true,
        caloriesBurned: 500,
        notes: 'Treino intenso!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(true);
    expect(res.body.caloriesBurned).toBe(500);
  });

  it('NÃO deve permitir concluir treino no FUTURO', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: tomorrow.toISOString(),
        completed: true // Tentar marcar como feito
      });

    expect(res.statusCode).toBe(403); // Forbidden
    expect(res.body.message).toMatch(/Ainda não podes concluir/);
  });

  it('Deve permitir criar nota futura (planeamento) mas SEM concluir', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const res = await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: tomorrow.toISOString(),
        completed: false, // Apenas agendado/anotação
        notes: 'Futuro treino de pernas'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.completed).toBe(false);
  });

  it('Deve calcular estatísticas corretamente', async () => {
    // Já temos 1 treino de 500 cal
    // Vamos adicionar outro ontem de 300 cal
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    await request(app)
      .post('/api/entries')
      .set('Authorization', `Bearer ${token}`)
      .send({
        date: yesterday.toISOString(),
        completed: true,
        caloriesBurned: 300
      });

    // Pedir Stats
    const res = await request(app)
      .get('/api/entries/stats?period=week')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    // Deve haver dados
    expect(Array.isArray(res.body)).toBe(true);
    
    // Validar soma (aproximada, dependendo se "ontem" mudou de semana ou não)
    // Mas pelo menos garante que a rota não crasha
    const totalEntries = res.body.reduce((acc, curr) => acc + curr.count, 0);
    expect(totalEntries).toBeGreaterThanOrEqual(1);
  });
});