// src/pages/LandingPage.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './css/LandingPage.css';

export default function LandingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (user) return null;

  const handleCreateAccount = () => {
    navigate('/auth?register');
  };

  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero text-center py-20">
        <div className="container">
          <h1 className="hero-title">
            Treinos Personalizados.<br />Resultados Reais.
          </h1>
          <p className="hero-text">
            Treine com um personal trainer dedicado. Planos semanais, acompanhamento diário e progresso garantido — tudo num só lugar.
          </p>
          <div className="hero-buttons">
            <button onClick={handleCreateAccount} className="btn btn-primary">
              Criar Conta Grátis
            </button>
            <a href="#features" className="btn btn-outline">
              Saber Mais
            </a>
          </div>
        </div>
      </section>

      {/* ===== STATS – VERSÃO ISOLADA E 100% CENTRADA ===== */}
      <section className="stats-section-custom">
        <div className="stats-wrapper-custom">
          <div className="stats-grid-custom">
            <div className="stats-block-custom">
              <div className="stats-number-custom">+500</div>
              <div className="stats-text-custom">Clientes Transformados</div>
            </div>
            <div className="stats-block-custom">
              <div className="stats-number-custom">3-5</div>
              <div className="stats-text-custom">Treinos por Semana</div>
            </div>
            <div className="stats-block-custom">
              <div className="stats-number-custom">1:10</div>
              <div className="stats-text-custom">Relação Trainer-Cliente</div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20">
        <div className="container">
          <h2 className="section-title">Como Funciona</h2>
          <div className="grid md-grid-cols-3">
            <div className="feature-card">
              <div className="feature-icon blue">1</div>
              <h3>Registo Rápido</h3>
              <p>Crie a sua conta em menos de 1 minuto. Escolha ser cliente ou personal trainer.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon green">2</div>
              <h3>Plano Personalizado</h3>
              <p>O seu trainer cria 3 a 5 treinos por semana, ajustados aos seus objetivos.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon purple">3</div>
              <h3>Acompanhe o Progresso</h3>
              <p>Dashboard com gráficos, chat em tempo real e feedback constante.</p>
            </div>
          </div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="testimonials">
        <div className="container">
          <h2 className="section-title">O Que Dizem os Nossos Clientes</h2>
          <div className="grid md-grid-cols-2">
            <div className="testimonial-card">
              <p className="testimonial-quote">
                "Perdi 8kg em 2 meses! O plano é fácil de seguir e o chat com o trainer é essencial."
              </p>
              <div className="testimonial-author">
                <img src="/images/ana-r.jpg" alt="Ana R." className="avatar" />
                <div>
                  <p className="name">Ana R.</p>
                  <p className="role">Cliente desde 2024</p>
                </div>
              </div>
            </div>

            <div className="testimonial-card">
              <p className="testimonial-quote">
                "Como trainer, consigo gerir todos os meus 10 clientes num só lugar. Simples e eficaz."
              </p>
              <div className="testimonial-author">
                <img src="/images/pedro-s.jpg" alt="Pedro S." className="avatar" />
                <div>
                  <p className="name">Pedro S.</p>
                  <p className="role">Personal Trainer</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="cta">
        <div className="container">
          <h2 className="section-title">
            Pronto para Começar a Sua Transformação?
          </h2>
          <p className="cta-text">
            Junte-se a centenas de pessoas que já mudaram de vida com treinos personalizados.
          </p>
          <button onClick={handleCreateAccount} className="btn cta-btn">
            Criar Conta Grátis
          </button>
        </div>
      </section>
    </div>
  );
}