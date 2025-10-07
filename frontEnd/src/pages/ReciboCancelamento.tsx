interface DadosReciboCancelamento {
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
    quantidade: number
    data_autorizacao: string
    autorizador_nome: string
  }
  beneficiosConcedidos?: Array<{
    id: number
    tipo_beneficio: string
    valor: number
    data_entrega: string
    responsavel_entrega: string
  }>
  cancelamento: {
    data_cancelamento: string
    motivo: string
    observacoes?: string
    responsavel_cancelamento: string
    cargo_responsavel: string
  }
}

export const gerarReciboCancelamento = (dados: DadosReciboCancelamento) => {
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

  const formatarValor = (valor: number | null | undefined) => {
    if (valor === null || valor === undefined) return "N/A"
    return `R$ ${Number(valor).toFixed(2).replace(".", ",")}`
  }

  const htmlRecibo = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Recibo de Cancelamento - ${dados.familia.prontuario}</title>
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

        .beneficios-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
          font-size: 12px;
        }

        .beneficios-table th,
        .beneficios-table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }

        .beneficios-table th {
          background-color: #f0f0f0;
          font-weight: bold;
        }

        .beneficios-table tr:nth-child(even) {
          background-color: #f9f9f9;
        }
        
        .signature-section {
          margin-top: 50px; 
          padding-top: 20px;
          border-top: 1px solid #ccc;
          font-size: 13px;
        }
        
        .signature-box {
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
          <h1>Recibo de Cancelamento</h1>
          <p>Cancelamento de Benefício Autorizado</p>
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
          <div class="section-title">Dados do Benefício Cancelado</div>
          <div class="info-row">
            <span class="info-label">Tipo de Benefício:</span>
            <span class="info-value">${formatarTipoBeneficio(dados.beneficio.tipo_beneficio)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Quantidade Autorizada:</span>
            <span class="info-value">${dados.beneficio.quantidade}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Data de Autorização:</span>
            <span class="info-value">${formatarData(dados.beneficio.data_autorizacao)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Autorizado por:</span>
            <span class="info-value">${dados.beneficio.autorizador_nome}</span>
          </div>
        </div>

        ${
          dados.beneficiosConcedidos && dados.beneficiosConcedidos.length > 0
            ? `
        <div class="section">
          <div class="section-title">Benefícios Concedidos (Já Entregues)</div>
          <table class="beneficios-table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Valor</th>
                <th>Data de Entrega</th>
                <th>Responsável pela Entrega</th>
              </tr>
            </thead>
            <tbody>
              ${dados.beneficiosConcedidos
                .map(
                  (beneficio) => `
                <tr>
                  <td>${formatarTipoBeneficio(beneficio.tipo_beneficio)}</td>
                  <td>${formatarValor(beneficio.valor)}</td>
                  <td>${formatarData(beneficio.data_entrega)}</td>
                  <td>${beneficio.responsavel_entrega}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
        `
            : ""
        }
        
        <div class="section">
          <div class="section-title">Dados do Cancelamento</div>
          <div class="info-row">
            <span class="info-label">Data do Cancelamento:</span>
            <span class="info-value">${formatarData(dados.cancelamento.data_cancelamento)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Responsável:</span>
            <span class="info-value">${dados.cancelamento.responsavel_cancelamento}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Cargo:</span>
            <span class="info-value">${dados.cancelamento.cargo_responsavel}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Motivo:</span>
            <span class="info-value">${dados.cancelamento.motivo}</span>
          </div>
          ${
            dados.cancelamento.observacoes
              ? `
          <div class="info-row">
            <span class="info-label">Observações:</span>
            <span class="info-value">${dados.cancelamento.observacoes}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="signature-section">
          <p style="margin-bottom: 15px; text-align: center;">
            Declaro estar ciente do cancelamento do benefício acima descrito e das razões apresentadas.
          </p>
          
          <div class="signature-box">
            <div class="signature-line"></div>
            <p><strong>Assinatura do Responsável</strong></p>
            <p style="font-size: 11px; margin-top: 4px;">${dados.familia.responsavel_nome}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Este documento comprova o cancelamento da autorização do benefício.</p>
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
              a.download = 'Recibo_Cancelamento_${dados.familia.prontuario}_${new Date().toISOString().split("T")[0]}.html';
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

  const janelaImpressao = window.open("", "_blank")
  if (janelaImpressao) {
    janelaImpressao.document.write(htmlRecibo)
    janelaImpressao.document.close()
  }
}
