import React from 'react';

/**
 * MOCKUP: Página de Benefícios
 * 
 * Objetivo: Servir como placeholder para a funcionalidade de benefícios e
 * comunicar a regra de acesso para a equipe de desenvolvimento.
 */
const Beneficios: React.FC = () => {
  return (
    // Container que centraliza tudo na tela
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      
      <div className="max-w-2xl w-full text-center">
        
        {/* 1. O Título da Página */}
        <h1 className="text-5xl font-bold text-gray-800">
          Benefícios
        </h1>

        {/* 2. A Nota Explicativa sobre o Acesso */}
        <div className="mt-8 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 rounded-md text-left">
          <p className="font-bold">Nota para a Equipe de Desenvolvimento:</p>
          <p className="mt-2 text-sm">
            Todos os usuários (internos e externos) têm acesso a esta página.
            <br />
            No entanto, para os <strong>colaboradores externos</strong>, esta deve ser a <strong>única página</strong> que eles podem acessar em toda a aplicação. O roteamento e a lógica de autenticação devem garantir essa restrição.
          </p>
        </div>

      </div>

    </div>
  );
};

export default Beneficios;