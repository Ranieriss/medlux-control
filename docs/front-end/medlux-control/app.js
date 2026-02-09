const tabs = document.querySelectorAll(".tab");
const sectionTitle = document.getElementById("sectionTitle");
const sectionText = document.getElementById("sectionText");

const tabCopy = {
  dashboard: {
    title: "Dashboard geral",
    text: "Resumo rápido do status dos equipamentos e alertas de calibração."
  },
  equipamentos: {
    title: "Equipamentos",
    text: "Cadastro, busca e atualização dos retrorrefletômetros disponíveis."
  },
  cautelas: {
    title: "Cautelas",
    text: "Registro de entrega, devolução e termos associados a cada equipamento."
  },
  pessoas: {
    title: "Pessoas",
    text: "Responsáveis internos e históricos de utilização em cada cautela."
  }
};

const setActiveTab = (tab) => {
  tabs.forEach((item) => item.setAttribute("aria-selected", "false"));
  tab.setAttribute("aria-selected", "true");
  const key = tab.dataset.section;
  const copy = tabCopy[key];
  if (copy) {
    sectionTitle.textContent = copy.title;
    sectionText.textContent = copy.text;
  }
};

tabs.forEach((tab) => {
  tab.addEventListener("click", () => setActiveTab(tab));
});

setActiveTab(document.querySelector(".tab"));
