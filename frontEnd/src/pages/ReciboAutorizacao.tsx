interface DadosRecibo {
  familia: {
    prontuario: string
    responsavel_nome: string
    responsavel_cpf: string
    endereco: string
    cidade: string
    uf: string
  }
  autorizacao: {
    tipo_beneficio: string
    quantidade: number
    validade_meses: number
    data_autorizacao: string
    data_validade: string
    justificativa: string
    observacoes?: string
  }
  autorizador: {
    nome: string
    cargo: string
  }
}

export const gerarReciboAutorizacao = (dados: DadosRecibo) => {
  const formatarTipoBeneficio = (tipo: string) => {
    const tipos: Record<string, string> = {
      cesta_basica: "Cesta Básica",
      auxilio_funeral: "Auxílio Funeral",
      auxilio_natalidade: "Auxílio Natalidade",
      passagem: "Passagem",
      outro: "Outro",
    }
    return tipos[tipo] || tipo
  }

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR", { timeZone: "UTC" })
  }

  const htmlRecibo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Autorização - ${dados.familia.prontuario}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4;
          margin: 0.8cm;
        }
        
        body {
          font-family: Arial, sans-serif;
          /* AJUSTE: Reduzir padding para que o container possa ocupar mais espaço */
          padding: 10px; 
          line-height: 1.4;
          color: #333;
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
        }
        
        .container {
          max-width: 100%;
          height: 100%;
          margin: 0 auto;
          border: 2px solid #333;
          /* AJUSTE: Aumentar padding interno para empurrar o conteúdo */
          padding: 30px; 
          display: flex;
          flex-direction: column;
        }
        
        .header {
          text-align: center;
          margin-bottom: 20px;
          border-bottom: 2px solid #333;
          padding-bottom: 15px;
        }
        
        .header h1 {
          font-size: 22px;
          margin-bottom: 8px;
          text-transform: uppercase;
        }
        
        .header p {
          font-size: 13px;
          color: #666;
        }
        
        .section {
          /* AJUSTE: Aumentar margem de fundo para espaçar as seções */
          margin-bottom: 25px; 
        }
        
        .section-title {
          font-size: 14px;
          font-weight: bold;
          margin-bottom: 8px;
          padding: 6px;
          background-color: #f0f0f0;
          border-left: 4px solid #333;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 6px;
          padding: 3px 0;
          font-size: 13px;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 160px;
        }
        
        .info-value {
          flex: 1;
        }
        
        .signature-section {
          /* AJUSTE: Aumentar margem superior para afastar do último bloco de dados */
          margin-top: 50px; 
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 13px;
        }
        
        .signature-box {
          /* AJUSTE: Aumentar para mais espaço entre a frase e a linha de assinatura */
          margin-top: 100px; 
          text-align: center;
        }
        
        .signature-line {
          border-top: 2px solid #333;
          width: 350px;
          margin: 0 auto 8px;
        }
        
        .footer {
          margin-top: auto;
          text-align: center;
          font-size: 11px;
          color: #666;
          border-top: 1px solid #ccc;
          padding-top: 15px;
        }
        
        @media print {
          body {
            padding: 0;
            width: 210mm;
            height: 297mm;
          }
          
          .container {
            border: 2px solid #000;
            page-break-inside: avoid;
          }
          
          @page {
            size: A4;
            margin: 0.8cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recibo de Autorização</h1>
          <p>Autorização de Benefício</p>
        </div>
        
        <div class="section">
          <div class="section-title">Dados da Família</div>
          <div class="info-row">
            <span class="info-label">Prontuário:</span>
            <span class="info-value">${dados.familia.prontuario}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Responsável:</span>
            <span class="info-value">${dados.familia.responsavel_nome}</span>
          </div>
          <div class="info-row">
            <span class="info-label">CPF:</span>
            <span class="info-value">${dados.familia.responsavel_cpf}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Endereço:</span>
            <span class="info-value">${dados.familia.endereco}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cidade/UF:</span>
            <span class="info-value">${dados.familia.cidade}/${dados.familia.uf}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Dados do Benefício Autorizado</div>
          <div class="info-row">
            <span class="info-label">Tipo de Benefício:</span>
            <span class="info-value">${formatarTipoBeneficio(dados.autorizacao.tipo_beneficio)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Quantidade:</span>
            <span class="info-value">${dados.autorizacao.quantidade}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Validade:</span>
            <span class="info-value">${dados.autorizacao.validade_meses} ${dados.autorizacao.validade_meses === 1 ? "mês" : "meses"}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data de Autorização:</span>
            <span class="info-value">${formatarData(dados.autorizacao.data_autorizacao)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Válido até:</span>
            <span class="info-value">${formatarData(dados.autorizacao.data_validade)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Justificativa:</span>
            <span class="info-value">${dados.autorizacao.justificativa}</span>
          </div>
          ${
            dados.autorizacao.observacoes
              ? `
          <div class="info-row">
            <span class="info-label">Observações:</span>
            <span class="info-value">${dados.autorizacao.observacoes}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="section">
          <div class="section-title">Dados do Autorizador</div>
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value">${dados.autorizador.nome}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cargo:</span>
            <span class="info-value">${dados.autorizador.cargo}</span>
          </div>
        </div>
        
        <div class="signature-section">
          <p style="margin-bottom: 15px; text-align: center;">
            Declaro que recebi a autorização acima descrita e estou ciente das condições estabelecidas.
          </p>
          
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Assinatura do Responsável</strong></p>
            <p style="font-size: 11px; margin-top: 4px;">${dados.familia.responsavel_nome}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Este documento comprova a autorização do benefício e deve ser apresentado no momento da retirada.</p>
          <p>Data de emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      </div>
      
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            
            setTimeout(function() {
              const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Recibo_Autorizacao_${dados.familia.prontuario}_${new Date().toISOString().split("T")[0]}.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 500);
          }, 100);
        }
      </script>
    </body>
    </html>
  `

  const janelaImpressao = window.open("", "_blank")
  if (janelaImpressao) {
    janelaImpressao.document.write(htmlRecibo)
    janelaImpressao.document.close()
  }
}