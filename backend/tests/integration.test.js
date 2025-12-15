// backend/tests/integration.test.js
const request = require('supertest');
const { app, connectDB, mongoose } = require('../index');
const User = require('../models/User');

// Configuração antes de todos os testes
beforeAll(async () => {
  await connectDB();
  // Limpar a base de dados de teste (opcional, cuidado se usar DB de produção)
  // await User.deleteMany({ username: /test_/ }); 
});

// Fechar conexão após os testes
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Fluxo de Autenticação e Utilizador', () => {
  
  const testUser = {
    username: 'test_client_' + Date.now(),
    password: 'password123',
    role: 'client',
    profile: {
      name: 'Test Client',
      email: 'test@example.com'
    }
  };

  let token = '';
  let userId = '';

  // 1. Teste de Registo
  it('Deve registar um novo utilizador com sucesso', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  // 2. Teste de Falha no Login
  it('Deve falhar login com password errada', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: 'wrongpassword'
      });

    expect(res.statusCode).toEqual(400);
  });

  // 3. Teste de Login com Sucesso
  it('Deve fazer login com sucesso e retornar token', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        username: testUser.username,
        password: testUser.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body).toHaveProperty('user');
    
    token = res.body.token; // Guardar token para o próximo teste
    userId = res.body.user._id;
  });

  // 4. Teste de Acesso a Rota Protegida (Perfil)
  it('Deve aceder ao perfil do utilizador (Rota Protegida)', async () => {
    const res = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${token}`); // Envia o token no header

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('_id', userId);
    expect(res.body.profile).toHaveProperty('name', testUser.profile.name);
  });

  // 5. Teste de Atualização de Perfil
  it('Deve atualizar o peso do utilizador', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${token}`)
      .send({
        weight: 75
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.profile).toHaveProperty('weight', 75);
  });

  // Limpeza (opcional): apagar o user criado no fim
  afterAll(async () => {
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
  });
});