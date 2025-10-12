interface DadosReciboEntrega {
  familia: {
    prontuario: string
    responsavel_nome: string
    responsavel_cpf: string
    endereco: string
    cidade: string
    uf: string
  }
  beneficio: {
    tipo_beneficio: string
    descricao: string
    valor: number
    data_entrega: string
    observacoes?: string
  }
  responsavel_entrega: {
    nome: string
    cargo: string
  }
}

export const gerarReciboEntrega = (dados: DadosReciboEntrega) => {
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

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(valor)
  }

  const htmlRecibo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Entrega - ${dados.familia.prontuario}</title>
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
          /* AJUSTE: Reduzido para 10px */
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
          /* AJUSTE: Aumentado para 30px */
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
          /* AJUSTE: Aumentado para 25px */
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
          /* AJUSTE: Aumentado para 50px */
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 13px;
        }
        
        .signature-box {
          /* AJUSTE: Aumentado para 100px */
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
          <h1>Recibo de Entrega</h1>
          <p>Comprovante de Entrega de Benefício</p>
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
          <div class="section-title">Dados do Benefício Entregue</div>
          <div class="info-row">
            <span class="info-label">Tipo de Benefício:</span>
            <span class="info-value">${formatarTipoBeneficio(dados.beneficio.tipo_beneficio)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Valor:</span>
            <span class="info-value">${formatarMoeda(dados.beneficio.valor)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data de Entrega:</span>
            <span class="info-value">${formatarData(dados.beneficio.data_entrega)}</span>
          </div>
          ${dados.beneficio.descricao
      ? `
          <div class="info-row">
            <span class="info-label">Descrição:</span>
            <span class="info-value">${dados.beneficio.descricao}</span>
          </div>
          `
      : ""
    }
          ${dados.beneficio.observacoes
      ? `
          <div class="info-row">
            <span class="info-label">Observações:</span>
            <span class="info-value">${dados.beneficio.observacoes}</span>
          </div>
          `
      : ""
    }
        </div>
        
        <div class="section">
          <div class="section-title">Responsável pela Entrega</div>
          <div class="info-row">
            <span class="info-label">Nome:</span>
            <span class="info-value">${dados.responsavel_entrega.nome}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cargo:</span>
            <span class="info-value">${dados.responsavel_entrega.cargo}</span>
          </div>
        </div>
        
        <div class="signature-section">
          <p style="margin-bottom: 15px; text-align: center;">
            Declaro que recebi o benefício acima descrito em perfeitas condições e estou ciente de que este documento comprova a entrega.
          </p>

          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Assinatura do Responsável</strong></p>
            <p style="font-size: 11px; margin-top: 4px;">${dados.familia.responsavel_nome}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Este documento comprova a entrega do benefício e deve ser arquivado para fins de controle.</p>
          <p>Data de emissão: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
        </div>
      </div>
      
      <script>
        let downloadExecuted = false;
        
        window.onload = function() {
          setTimeout(function() {
            window.print();
          }, 100);
          
          if (!downloadExecuted) {
            downloadExecuted = true;
            setTimeout(function() {
              const blob = new Blob([document.documentElement.outerHTML], { type: 'text/html' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'Recibo_Entrega_${dados.familia.prontuario}_${new Date().toISOString().split("T")[0]}.html';
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }, 500);
          }
        }
      </script>
    </body>
    </html>
  `

  // Abrir em nova janela para impressão
  const janelaImpressao = window.open("", "_blank")
  if (janelaImpressao) {
    janelaImpressao.document.write(htmlRecibo)
    janelaImpressao.document.close()
  }
}
