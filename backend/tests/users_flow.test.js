// backend/tests/users_flow.test.js
const request = require('supertest');
const { app, connectDB, mongoose } = require('../index');
const User = require('../models/User');
const TrainerChangeRequest = require('../models/TrainerChangeRequest');

beforeAll(async () => {
  await connectDB();
  // Limpar dados de teste anteriores para evitar conflitos
  await User.deleteMany({ email: /@test-flow.com/ });
  await TrainerChangeRequest.deleteMany({});
});

afterAll(async () => {
  await mongoose.connection.close();
});

describe('Fluxo de Utilizadores e Conexão Treinador', () => {
  
  let clientToken, trainerToken;
  let clientId, trainerId;

  // Dados fictícios
  const clientData = {
    username: 'flow_client',
    password: 'password123',
    role: 'client',
    profile: { name: 'Cliente Flow', email: 'client@test-flow.com' }
  };

  const trainerData = {
    username: 'flow_trainer',
    password: 'password123',
    role: 'trainer',
    profile: { name: 'Treinador Flow', email: 'trainer@test-flow.com' }
  };

  // 1. REGISTO E LOGIN
  it('Deve registar Cliente e Treinador', async () => {
    // Registar Cliente
    const resClient = await request(app).post('/api/auth/register').send(clientData);
    expect(resClient.statusCode).toBe(200);
    clientToken = resClient.body.token;
    clientId = resClient.body.user._id;

    // Registar Treinador
    const resTrainer = await request(app).post('/api/auth/register').send(trainerData);
    expect(resTrainer.statusCode).toBe(200);
    
    // Simular que o admin validou o treinador (necessário para ele aparecer nas listas)
    await User.findByIdAndUpdate(resTrainer.body.user._id, { validated: true });
    
    // Fazer login para obter token atualizado do treinador
    const loginTrainer = await request(app).post('/api/auth/login').send({
      username: trainerData.username,
      password: trainerData.password
    });
    trainerToken = loginTrainer.body.token;
    trainerId = loginTrainer.body.user._id;
  });

  // 2. SEGURANÇA (PASSWORD)
  it('Deve alterar a password do cliente com sucesso', async () => {
    const res = await request(app)
      .patch('/api/users/me/password')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({
        currentPassword: 'password123',
        newPassword: 'newpassword123',
        confirmPassword: 'newpassword123'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/sucesso/);
  });

  it('Deve falhar login com a password antiga', async () => {
    const res = await request(app).post('/api/auth/login').send({
      username: clientData.username,
      password: 'password123'
    });
    expect(res.statusCode).toBe(400); // Unauthorized ou Bad Request
  });

  // Reverter password para facilitar testes seguintes (ou atualizar o token se necessário)
  // Para simplificar, vamos usar a nova password daqui para a frente se precisássemos de novo login
  
  // 3. FLUXO DE CONTRATAÇÃO (Crucial para o teu projeto)
  it('Cliente pede para ser treinado (Request Trainer Change)', async () => {
    const res = await request(app)
      .post('/api/users/me/request-trainer-change')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ newTrainerId: trainerId });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/enviado/);
    
    // Verificar se ficou na DB como pendente
    const reqDb = await TrainerChangeRequest.findOne({ client: clientId, newTrainer: trainerId });
    expect(reqDb).toBeTruthy();
    expect(reqDb.status).toBe('pending');
  });

  it('Treinador vê o pedido pendente', async () => {
    const res = await request(app)
      .get('/api/trainers/requests')
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].client._id).toBe(clientId);
  });

  it('Treinador ACEITA o pedido', async () => {
    // Buscar o ID do pedido
    const reqDb = await TrainerChangeRequest.findOne({ client: clientId, status: 'pending' });

    const res = await request(app)
      .post(`/api/trainers/requests/${reqDb._id}/resolve`)
      .set('Authorization', `Bearer ${trainerToken}`)
      .send({ action: 'accept' });

    expect(res.statusCode).toBe(200);
    expect(res.body.message).toMatch(/aceite/);

    // VERIFICAÇÃO FINAL: O cliente tem o treinador atribuído?
    const updatedClient = await User.findById(clientId);
    expect(updatedClient.trainerAssigned.toString()).toBe(trainerId);
  });

  it('Treinador consegue ver o novo cliente na sua lista', async () => {
    const res = await request(app)
      .get('/api/users/my-clients') // Rota definida em users.js
      .set('Authorization', `Bearer ${trainerToken}`);

    expect(res.statusCode).toBe(200);
    const found = res.body.find(c => c._id === clientId);
    expect(found).toBeDefined();
  });
});