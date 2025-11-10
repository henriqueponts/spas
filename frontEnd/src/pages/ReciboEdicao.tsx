interface DadosReciboEdicao {
  familia: {
    prontuario: string
    responsavel_nome: string
    responsavel_cpf: string
    endereco: string
    cidade: string
    uf: string
  }
  autorizacao_anterior: {
    tipo_beneficio: string
    quantidade: number
    validade_meses: number
    justificativa: string
    observacoes?: string
  }
  autorizacao_nova: {
    tipo_beneficio: string
    quantidade: number
    validade_meses: number
    data_validade: string
    justificativa: string
    observacoes?: string
  }
  edicao: {
    data_edicao: string
    motivo_edicao: string
    responsavel_edicao: string
    cargo_responsavel: string
  }
}

export const gerarReciboEdicao = (dados: DadosReciboEdicao) => {
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
      <title>Recibo de Edição - ${dados.familia.prontuario}</title>
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        @page {
          size: A4;
          margin: 1.5cm;
        }
        
        body {
          font-family: Arial, sans-serif;
          line-height: 1.3;
          color: #000;
          width: 210mm;
          height: 297mm;
          margin: 0 auto;
          background: white;
        }
        
        .container {
          max-width: 100%;
          height: 100%;
          margin: 0 auto;
          border: 2px solid #000;
          padding: 15px;
          display: flex;
          flex-direction: column;
        }
        
        .header {
          text-align: center;
          margin-bottom: 12px;
          border-bottom: 2px solid #000;
          padding-bottom: 8px;
        }
        
        .header h1 {
          font-size: 18px;
          margin-bottom: 4px;
          text-transform: uppercase;
          font-weight: bold;
        }
        
        .header p {
          font-size: 11px;
        }
        
        .section {
          margin-bottom: 10px;
        }
        
        .section-title {
          font-size: 12px;
          font-weight: bold;
          margin-bottom: 5px;
          padding: 4px 6px;
          border: 1px solid #000;
          background-color: #fff;
        }
        
        .info-row {
          display: flex;
          margin-bottom: 3px;
          font-size: 11px;
        }
        
        .info-label {
          font-weight: bold;
          min-width: 140px;
        }
        
        .info-value {
          flex: 1;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .comparison-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 5px;
          font-size: 10px;
        }

        .comparison-table th,
        .comparison-table td {
          border: 1px solid #000;
          padding: 4px 6px;
          text-align: left;
          word-wrap: break-word;
          overflow-wrap: break-word;
          word-break: break-word;
        }

        .comparison-table th {
          background-color: #fff;
          font-weight: bold;
        }

        .comparison-table .old-value {
          text-decoration: line-through;
        }

        .comparison-table .new-value {
          font-weight: bold;
        }
        
        .signature-section {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #000;
          font-size: 10px;
        }
        
        .signature-box {
          margin-top: 40px;
          text-align: center;
        }
        
        .signature-line {
          border-top: 1px solid #000;
          width: 300px;
          margin: 0 auto 5px;
        }
        
        .footer {
          margin-top: auto;
          text-align: center;
          font-size: 9px;
          border-top: 1px solid #000;
          padding-top: 8px;
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
            margin: 1.5cm;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Recibo de Edição de Autorização</h1>
          <p>Alteração de Benefício Autorizado</p>
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
            <span class="info-value">${dados.familia.endereco}, ${dados.familia.cidade}/${dados.familia.uf}</span>
          </div>
        </div>
        
        <div class="section">
          <div class="section-title">Alterações Realizadas</div>
          <table class="comparison-table">
            <thead>
              <tr>
                <th style="width: 30%;">Campo</th>
                <th style="width: 35%;">Valor Anterior</th>
                <th style="width: 35%;">Novo Valor</th>
              </tr>
            </thead>
            <tbody>
              ${
                dados.autorizacao_anterior.tipo_beneficio !== dados.autorizacao_nova.tipo_beneficio
                  ? `
              <tr>
                <td><strong>Tipo de Benefício</strong></td>
                <td class="old-value">${formatarTipoBeneficio(dados.autorizacao_anterior.tipo_beneficio)}</td>
                <td class="new-value">${formatarTipoBeneficio(dados.autorizacao_nova.tipo_beneficio)}</td>
              </tr>
              `
                  : ""
              }
              ${
                dados.autorizacao_anterior.quantidade !== dados.autorizacao_nova.quantidade
                  ? `
              <tr>
                <td><strong>Quantidade</strong></td>
                <td class="old-value">${dados.autorizacao_anterior.quantidade}</td>
                <td class="new-value">${dados.autorizacao_nova.quantidade}</td>
              </tr>
              `
                  : ""
              }
              ${
                dados.autorizacao_anterior.validade_meses !== dados.autorizacao_nova.validade_meses
                  ? `
              <tr>
                <td><strong>Validade (meses)</strong></td>
                <td class="old-value">${dados.autorizacao_anterior.validade_meses}</td>
                <td class="new-value">${dados.autorizacao_nova.validade_meses}</td>
              </tr>
              `
                  : ""
              }
              ${
                dados.autorizacao_anterior.justificativa !== dados.autorizacao_nova.justificativa
                  ? `
              <tr>
                <td><strong>Justificativa</strong></td>
                <td class="old-value">${dados.autorizacao_anterior.justificativa}</td>
                <td class="new-value">${dados.autorizacao_nova.justificativa}</td>
              </tr>
              `
                  : ""
              }
              ${
                (dados.autorizacao_anterior.observacoes || "") !== (dados.autorizacao_nova.observacoes || "")
                  ? `
              <tr>
                <td><strong>Observações</strong></td>
                <td class="old-value">${dados.autorizacao_anterior.observacoes || "Nenhuma"}</td>
                <td class="new-value">${dados.autorizacao_nova.observacoes || "Nenhuma"}</td>
              </tr>
              `
                  : ""
              }
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="section-title">Dados Atualizados do Benefício</div>
          <div class="info-row">
            <span class="info-label">Tipo:</span>
            <span class="info-value">${formatarTipoBeneficio(dados.autorizacao_nova.tipo_beneficio)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Quantidade:</span>
            <span class="info-value">${dados.autorizacao_nova.quantidade}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Validade:</span>
            <span class="info-value">${dados.autorizacao_nova.validade_meses} ${dados.autorizacao_nova.validade_meses === 1 ? "mês" : "meses"} (até ${formatarData(dados.autorizacao_nova.data_validade)})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Justificativa:</span>
            <span class="info-value">${dados.autorizacao_nova.justificativa}</span>
          </div>
          ${
            dados.autorizacao_nova.observacoes
              ? `
          <div class="info-row">
            <span class="info-label">Observações:</span>
            <span class="info-value">${dados.autorizacao_nova.observacoes}</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="section">
          <div class="section-title">Dados da Edição</div>
          <div class="info-row">
            <span class="info-label">Data da Edição:</span>
            <span class="info-value">${formatarData(dados.edicao.data_edicao)}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Responsável:</span>
            <span class="info-value">${dados.edicao.responsavel_edicao} (${dados.edicao.cargo_responsavel})</span>
          </div>
          <div class="info-row">
            <span class="info-label">Motivo:</span>
            <span class="info-value">${dados.edicao.motivo_edicao}</span>
          </div>
        </div>
        
        <div class="signature-section">
          <p style="margin-bottom: 10px; text-align: center;">
            Declaro estar ciente das alterações realizadas na autorização do benefício acima descrito.
          </p>
          
          <div class="signature-box">
            <div class="signature-line"></div>
            <p style="font-size: 10px;"><strong>Assinatura do Responsável</strong></p>
            <p style="font-size: 9px; margin-top: 2px;">${dados.familia.responsavel_nome}</p>
          </div>
        </div>
        
        <div class="footer">
          <p>Este documento comprova a edição da autorização do benefício.</p>
          <p>Emitido em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}</p>
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
              a.download = 'Recibo_Edicao_${dados.familia.prontuario}_${new Date().toISOString().split("T")[0]}.html';
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
