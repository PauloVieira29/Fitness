// backend/tests/integration.test.js
const request = require('supertest');
const { app, connectDB, mongoose } = require('../index');
const User = require('../models/User');
const Plan = require('../models/Plan'); // Importar para limpar depois

// Configuração antes de todos os testes
beforeAll(async () => {
  await connectDB();
  // Limpar dados antigos para garantir testes limpos
  // await User.deleteMany({ username: /test_/ });
  // await Plan.deleteMany({ name: /Teste de Integração/ });
});

// Fechar conexão após os testes
afterAll(async () => {
  await mongoose.connection.close();
});

describe('Fluxo Completo: Autenticação, Perfis e Planos', () => {
  
  // Dados do Cliente
  const testClient = {
    username: 'test_client_' + Date.now(),
    password: 'password123',
    role: 'client',
    profile: { name: 'Cliente Teste', email: 'client@test.com' }
  };

  // Dados do Treinador (Novo)
  const testTrainer = {
    username: 'test_trainer_' + Date.now(),
    password: 'password123',
    role: 'trainer',
    profile: { name: 'Treinador Teste', email: 'trainer@test.com' }
  };

  let clientToken = '';
  let clientId = '';
  
  let trainerToken = '';
  let trainerId = '';

  // --- PARTE 1: CLIENTE ---

  it('1. Deve registar um novo CLIENTE com sucesso', async () => {
    const res = await request(app).post('/api/auth/register').send(testClient);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('2. Deve fazer login como CLIENTE', async () => {
    const res = await request(app).post('/api/auth/login').send({
        username: testClient.username,
        password: testClient.password
      });

    expect(res.statusCode).toEqual(200);
    clientToken = res.body.token;
    clientId = res.body.user._id;
  });

  it('3. Deve atualizar o perfil do CLIENTE (Peso)', async () => {
    const res = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ weight: 75 });

    expect(res.statusCode).toEqual(200);
    expect(res.body.profile).toHaveProperty('weight', 75);
  });

  // --- PARTE 2: TREINADOR ---

  it('4. Deve registar um novo TREINADOR', async () => {
    const res = await request(app).post('/api/auth/register').send(testTrainer);
    expect(res.statusCode).toEqual(200);
  });

  it('5. Deve fazer login como TREINADOR', async () => {
    const res = await request(app).post('/api/auth/login').send({
        username: testTrainer.username,
        password: testTrainer.password
      });

    expect(res.statusCode).toEqual(200);
    expect(res.body.user.role).toBe('trainer');
    
    trainerToken = res.body.token;
    trainerId = res.body.user._id;
  });

  // --- PARTE 3: INTERAÇÃO (Simulada) ---

  it('6. Setup: Associar Cliente ao Treinador (Simulação de DB)', async () => {
    // Nota: Como a API exige que o pedido seja aceite para associar,
    // aqui forçamos a associação diretamente na DB para facilitar o teste de integração do Plano.
    await User.findByIdAndUpdate(clientId, { trainerAssigned: trainerId });
    
    const updatedClient = await User.findById(clientId);
    expect(updatedClient.trainerAssigned.toString()).toBe(trainerId);
  });

  it('7. Treinador cria um PLANO para o Cliente', async () => {
    const planData = {
      clientId: clientId,
      name: 'Plano Teste de Integração',
      weeks: 4,
      sessionsPerWeek: 3,
      days: [
        { dayOfWeek: 'Segunda', exercises: [{ name: 'Agachamento', sets: 3, reps: '10' }] }
      ],
      notes: 'Foco na técnica.'
    };

    const res = await request(app)
      .post('/api/plans') // Rota definida em backend/routes/plans.js 
      .set('Authorization', `Bearer ${trainerToken}`)
      .send(planData);

    expect(res.statusCode).toEqual(201);
    expect(res.body.plan).toHaveProperty('name', 'Plano Teste de Integração');
    expect(res.body.plan.client._id).toBe(clientId);
  });

  // --- PARTE 4: CLIENTE VÊ DADOS ---

  it('8. Cliente deve conseguir ver o seu PLANO', async () => {
    const res = await request(app)
      .get('/api/plans/my') // Rota definida em backend/routes/plans.js 
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).not.toBeNull();
    expect(res.body.name).toBe('Plano Teste de Integração');
    // Verifica se o objeto trainer veio populado (com username)
    expect(res.body.trainer).toHaveProperty('username', testTrainer.username);
  });

  it('9. Cliente deve ver as suas ESTATÍSTICAS', async () => {
    const res = await request(app)
      .get('/api/plans/my/stats') // Rota definida em backend/routes/plans.js 
      .set('Authorization', `Bearer ${clientToken}`);

    expect(res.statusCode).toEqual(200);
    // Como acabou de criar e não treinou, deve ter 0
    expect(res.body).toHaveProperty('workoutsThisMonth', 0);
    expect(res.body).toHaveProperty('weeklyAdherence');
  });

  // Limpeza final
  afterAll(async () => {
    if (clientId) await User.findByIdAndDelete(clientId);
    if (trainerId) await User.findByIdAndDelete(trainerId);
    // Apagar planos criados pelo teste
    await Plan.deleteMany({ name: 'Plano Teste de Integração' });
  });
});