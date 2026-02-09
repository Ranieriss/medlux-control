const seedEquipamentos = () => ([
  {
    id: "RH01",
    tipo: "HORIZONTAL",
    modelo: "MTLX-300",
    numeroSerie: "HX-8321",
    dataAquisicao: "2022-01-12",
    dataCalibracao: "2024-02-15",
    status: "ATIVO",
    responsavelAtual: "Equipe Norte",
    observacoes: "Em operação padrão na frota rodoviária."
  },
  {
    id: "RV02",
    tipo: "VERTICAL",
    modelo: "MTLX-280",
    numeroSerie: "VX-2210",
    dataAquisicao: "2021-08-05",
    dataCalibracao: "2023-11-01",
    status: "EM_CAUTELA",
    responsavelAtual: "Leonardo",
    observacoes: "Separado para contrato de sinalização vertical."
  },
  {
    id: "RT03",
    tipo: "TACHAS",
    modelo: "MTLX-150",
    numeroSerie: "TX-901",
    dataAquisicao: "2020-03-20",
    dataCalibracao: "2023-05-20",
    status: "MANUTENCAO",
    responsavelAtual: "Cesar",
    observacoes: "Aguardando reparo no sensor óptico."
  },
  {
    id: "RH04",
    tipo: "HORIZONTAL",
    modelo: "MTLX-310",
    numeroSerie: "HX-4433",
    dataAquisicao: "2022-11-11",
    dataCalibracao: "2024-01-10",
    status: "EM_CALIBRACAO",
    responsavelAtual: "Laboratório Central",
    observacoes: "Em verificação de alinhamento interno."
  },
  {
    id: "RV05",
    tipo: "VERTICAL",
    modelo: "MTLX-290",
    numeroSerie: "VX-3002",
    dataAquisicao: "2021-06-18",
    dataCalibracao: "2024-03-02",
    status: "ATIVO",
    responsavelAtual: "Sandra",
    observacoes: "Uso regular em medições de placas."
  }
]);

export { seedEquipamentos };
