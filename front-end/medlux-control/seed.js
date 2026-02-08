const seedEquipamentos = () => ([
  {
    id: "RH01",
    tipo: "HORIZONTAL",
    modelo: "MTLX-300",
    numeroSerie: "HX-8321",
    dataAquisicao: "2022-01-12",
    dataCalibracao: "2024-02-15",
    dataVencimento: "2025-02-14",
    certificado: "CAL-2024-0215",
    fabricante: "Medlux Instruments",
    responsavelAtual: "Equipe Norte",
    situacaoManual: "ATIVO",
    observacoes: "Em operação padrão na frota rodoviária."
  },
  {
    id: "RV02",
    tipo: "VERTICAL",
    modelo: "MTLX-280",
    numeroSerie: "VX-2210",
    dataAquisicao: "2021-08-05",
    dataCalibracao: "2023-11-01",
    dataVencimento: "2024-10-31",
    certificado: "CAL-2023-1101",
    fabricante: "Medlux Instruments",
    responsavelAtual: "Leonardo",
    situacaoManual: "EM_CAUTELA",
    observacoes: "Separado para contrato de sinalização vertical."
  },
  {
    id: "RT03",
    tipo: "TACHAS",
    modelo: "MTLX-150",
    numeroSerie: "TX-901",
    dataAquisicao: "2020-03-20",
    dataCalibracao: "2023-05-20",
    dataVencimento: "2024-05-19",
    certificado: "CAL-2023-0520",
    fabricante: "Medlux Instruments",
    responsavelAtual: "Cesar",
    situacaoManual: "MANUTENCAO",
    observacoes: "Aguardando reparo no sensor óptico."
  },
  {
    id: "RH04",
    tipo: "HORIZONTAL",
    modelo: "MTLX-310",
    numeroSerie: "HX-4433",
    dataAquisicao: "2022-11-11",
    dataCalibracao: "2024-01-10",
    dataVencimento: "2025-01-09",
    certificado: "CAL-2024-0110",
    fabricante: "Medlux Instruments",
    responsavelAtual: "Laboratório Central",
    situacaoManual: "EM_CALIBRACAO",
    observacoes: "Em verificação de alinhamento interno."
  },
  {
    id: "RV05",
    tipo: "VERTICAL",
    modelo: "MTLX-290",
    numeroSerie: "VX-3002",
    dataAquisicao: "2021-06-18",
    dataCalibracao: "2024-03-02",
    dataVencimento: "2025-03-01",
    certificado: "CAL-2024-0302",
    fabricante: "Medlux Instruments",
    responsavelAtual: "Sandra",
    situacaoManual: "ATIVO",
    observacoes: "Uso regular em medições de placas."
  }
]);

export { seedEquipamentos };
