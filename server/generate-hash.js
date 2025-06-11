
import bcrypt from 'bcrypt';

// Função assíncrona para poder usar 'await'
async function createHash() {
  try {
    const password = '07151814'; // <-- Coloque a senha que você quer criptografar aqui
    const saltRounds = 10; // Custo do processamento (padrão é 10)

    const hash = await bcrypt.hash(password, saltRounds);

    console.log('Senha original:', password);
    console.log('Hash gerado:', hash);
    console.log('\nCopiado para a área de transferência!');
    
    // Bônus: Copia o hash para a área de transferência automaticamente (se possível)
    try {
      const { clipboard } = await import('clipboardy');
      await clipboard.write(hash);
    } catch (err) {
      console.log('(Para copiar automaticamente, instale clipboardy: npm install clipboardy)');
    }

  } catch (error) {
    console.error('Ocorreu um erro ao gerar o hash:', error);
  }
}

// Executa a função
createHash();