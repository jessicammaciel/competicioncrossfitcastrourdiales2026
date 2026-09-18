import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";

import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

import firebaseConfig from "./firebase-config.js";


// ===============================
// FIREBASE
// ===============================

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);


document.addEventListener("DOMContentLoaded", async () => {

  const teamsCollection = collection(db, "teams");

  const registerForm =
    document.getElementById("registerForm");

  const participantSelect =
    document.getElementById("participant");


  // ===============================
  // OBTENER EQUIPOS
  // ===============================

  async function fetchTeams() {

    try {

      const querySnapshot =
        await getDocs(teamsCollection);

      return querySnapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));

    } catch (error) {

      console.error(
        "Error al cargar equipos:",
        error
      );

      return [];

    }

  }



  function updateParticipantSelect(teams) {

    if (!participantSelect) return;

    participantSelect.innerHTML = "";


    teams.forEach(team => {

      const option =
        document.createElement("option");

      option.value = team.id;

      option.textContent =
        `${team.teamName} (${team.athlete1} & ${team.athlete2})`;

      participantSelect.appendChild(option);

    });

  }


  // ===============================
  // ¿TIENE RESULTADO?
  // ===============================

  function hasScore(team, wod) {

    return (
      team.scores &&
      team.scores[wod] !== undefined &&
      team.scores[wod] !== null &&
      team.scores[wod] !== ""
    );

  }


  // ===============================
  // ACTUALIZAR RANKINGS
  // ===============================

  function updateRankings(teams) {

 

    teams.forEach(team => {

      team.rankingPositions = {};

    });


    const targets = {

      general:
        document.getElementById("general_parejas"),

      wod1:
        document.getElementById("wod1_parejas"),

      wod2:
        document.getElementById("wod2_parejas"),

      wod3:
        document.getElementById("wod3_parejas"),

      wod4:
        document.getElementById("wod4_parejas")

    };


    // WOD 1
    // FOR TIME 15'

    renderRankingList(
      "wod1",
      sortWODForTime(teams, "wod1"),
      targets.wod1
    );


    // WOD 2
    // AMRAP 8'

    renderRankingList(
      "wod2",
      sortHighestWins(teams, "wod2"),
      targets.wod2
    );


    // WOD 3
    // RM

    renderRankingList(
      "wod3",
      sortHighestWins(teams, "wod3"),
      targets.wod3
    );


    // WOD 4
    // FOR TIME 10'

    renderRankingList(
      "wod4",
      sortWODForTime(teams, "wod4"),
      targets.wod4
    );


    calculateAverageRank(teams);

    renderGeneralRanking(
      teams,
      targets.general
    );

  }


  // ===============================
  // FOR TIME
  // ===============================

  function sortWODForTime(teams, wod) {

    

    const teamsWithScore =
      teams.filter(team => hasScore(team, wod));


    const completed =
      teamsWithScore.filter(team =>
        team.details?.[wod]?.completed === "yes"
      );


    const notCompleted =
      teamsWithScore.filter(team =>
        team.details?.[wod]?.completed === "no"
      );


    // COMPLETADOS
    // Menor tiempo gana

    completed.sort((a, b) => {

      return (
        Number(a.scores[wod]) -
        Number(b.scores[wod])
      );

    });


    // NO COMPLETADOS
    // Más reps gana

    notCompleted.sort((a, b) => {

      return (
        Number(b.scores[wod]) -
        Number(a.scores[wod])
      );

    });


    /*
      Todos los que completaron
      quedan por encima de los que
      no completaron.
    */

    return [
      ...completed,
      ...notCompleted
    ];

  }


  // ===============================
  // AMRAP / RM
  // ===============================

  function sortHighestWins(teams, wod) {

    return teams
      .filter(team => hasScore(team, wod))
      .sort((a, b) => {

        return (
          Number(b.scores[wod]) -
          Number(a.scores[wod])
        );

      });

  }


  // ===============================
  // CLAVE PARA EMPATES
  // ===============================

  function getRankingKey(team, wod) {

    const score =
      Number(team.scores[wod]);


    /*
      En For Time necesitamos diferenciar:

      completado 500 segundos

      de

      no completado 500 reps
    */

    if (wod === "wod1" || wod === "wod4") {

      const completed =
        team.details?.[wod]?.completed;

      return `${completed}-${score}`;

    }


    return String(score);

  }


  // ===============================
  // MOSTRAR RANKING WOD
  // ===============================

  function renderRankingList(
    wodName,
    sortedTeams,
    container
  ) {

    if (!container) return;


    container.innerHTML = "";


    if (sortedTeams.length === 0) {

      container.innerHTML =
        '<p class="text-muted">Todavía no hay resultados.</p>';

      return;

    }


    let currentPosition = 1;

    let previousKey = null;

    let previousPosition = 1;


    sortedTeams.forEach(team => {

      const rankingKey =
        getRankingKey(team, wodName);


      // EMPATES

      if (
        previousKey !== null &&
        rankingKey === previousKey
      ) {

        team.rankingPositions[wodName] =
          previousPosition;

      } else {

        previousPosition =
          currentPosition;

        team.rankingPositions[wodName] =
          currentPosition;

      }


      previousKey = rankingKey;

      currentPosition++;


      const li =
        document.createElement("li");


      li.classList.add(
        "ranking-item"
      );


      const position =
        team.rankingPositions[wodName];


      // PODIUM

      if (position === 1) {

        li.classList.add("first");

      }

      else if (position === 2) {

        li.classList.add("second");

      }

      else if (position === 3) {

        li.classList.add("third");

      }

      else {

        li.classList.add("other");

      }


      const score =
        Number(team.scores[wodName]);


      let resultText = "";


      // ==========================
      // WOD 1 / WOD 4
      // ==========================

      if (
        wodName === "wod1" ||
        wodName === "wod4"
      ) {

        if (
          team.details?.[wodName]?.completed === "yes"
        ) {

          resultText =
            `Tiempo: ${formatTime(score)}`;

        } else {

          resultText =
            `Repeticiones: ${score}`;

        }

      }


      // ==========================
      // WOD 2
      // ==========================

      else if (wodName === "wod2") {

        resultText =
          `Repeticiones: ${score}`;

      }


      // ==========================
      // WOD 3
      // ==========================

      else if (wodName === "wod3") {

        resultText =
          `Peso: ${score} kg`;

      }


      li.textContent =
        `${position}. ` +
        `${team.teamName} ` +
        `(${team.athlete1} & ${team.athlete2}) ` +
        `- ${resultText}`;


      container.appendChild(li);

    });

  }


  // ===============================
  // RANKING GENERAL
  // ===============================

  function calculateAverageRank(teams) {

    teams.forEach(team => {

      const positions =
        Object.values(
          team.rankingPositions || {}
        );


      if (positions.length === 0) {

        team.averageRank = null;

        return;

      }


      const total =
        positions.reduce(
          (sum, position) =>
            sum + position,
          0
        );


      team.averageRank =
        total / positions.length;

    });

  }


function renderGeneralRanking(teams, container) {

  if (!container) return;

  container.innerHTML = "";

  // Equipos que ya tienen al menos un resultado
  const teamsWithResults =
    teams
      .filter(team => team.averageRank !== null)
      .sort(
        (a, b) =>
          a.averageRank - b.averageRank
      );

  // Equipos registrados pero todavía sin resultados
  const teamsWithoutResults =
    teams.filter(
      team => team.averageRank === null
    );


  let currentPosition = 1;
  let previousAverage = null;
  let previousPosition = 1;


  // =========================
  // CON RESULTADOS
  // =========================

  teamsWithResults.forEach(team => {

    if (
      previousAverage !== null &&
      team.averageRank === previousAverage
    ) {

      team.generalPosition =
        previousPosition;

    } else {

      previousPosition =
        currentPosition;

      team.generalPosition =
        currentPosition;
    }

    previousAverage =
      team.averageRank;

    currentPosition++;

    const li =
      document.createElement("li");

    li.classList.add("ranking-item");

    const position =
      team.generalPosition;

    if (position === 1) {
      li.classList.add("first");
    }
    else if (position === 2) {
      li.classList.add("second");
    }
    else if (position === 3) {
      li.classList.add("third");
    }
    else {
      li.classList.add("other");
    }

    li.textContent =
      `${position}. ${team.teamName} ` +
      `(${team.athlete1} & ${team.athlete2}) ` +
      `- General: ${team.averageRank.toFixed(2)}`;

    container.appendChild(li);
  });


  // =========================
  // SIN RESULTADOS
  // =========================

  teamsWithoutResults.forEach(team => {

    const li =
      document.createElement("li");

    li.classList.add(
      "ranking-item",
      "other"
    );

    li.textContent =
      `— ${team.teamName} ` +
      `(${team.athlete1} & ${team.athlete2}) ` +
      `- Sin resultados`;

    container.appendChild(li);
  });
}


  // ===============================
  // FORMATEAR TIEMPO
  // ===============================

  function formatTime(seconds) {

    const totalSeconds =
      Number(seconds) || 0;


    const minutes =
      Math.floor(
        totalSeconds / 60
      );


    const remainingSeconds =
      totalSeconds % 60;


    return (
      `${minutes}m ` +
      `${remainingSeconds}s`
    );

  }


  // ===============================
  // REGISTRAR EQUIPO
  // ===============================

  if (registerForm) {

    registerForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const teamName =
          document
            .getElementById("teamName")
            .value
            .trim();


        const athlete1 =
          document
            .getElementById("athlete1")
            .value
            .trim();


        const athlete2 =
          document
            .getElementById("athlete2")
            .value
            .trim();


        if (
          !teamName ||
          !athlete1 ||
          !athlete2
        ) {

          return;

        }


        const newTeam = {

          teamName,

          athlete1,

          athlete2,

          scores: {},

          details: {}

        };


        try {

          await addDoc(
            teamsCollection,
            newTeam
          );


          registerForm.reset();


          const teams =
            await fetchTeams();


          updateRankings(teams);


          alert(
            "¡Equipo registrado correctamente!"
          );


        } catch (error) {

          console.error(
            "Error al registrar equipo:",
            error
          );

        }

      }
    );


    const teams =
      await fetchTeams();


    updateRankings(teams);

  }


  // ===============================
  // ADMIN
  // ===============================

  if (participantSelect) {

    let teams =
      await fetchTeams();


    updateParticipantSelect(teams);

    updateRankings(teams);


    const scoreForm =
      document.getElementById(
        "scoreForm"
      );


    // =============================
    // ACTUALIZAR RESULTADO
    // =============================

    scoreForm.addEventListener(
      "submit",
      async event => {

        event.preventDefault();


        const teamId =
          participantSelect.value;


        const wod =
          document
            .getElementById("wod")
            .value;


        if (!teamId || !wod) {

          alert(
            "Selecciona un equipo y un WOD."
          );

          return;

        }


        let score;

        let details;


        // =========================
        // WOD 1 / WOD 4
        // FOR TIME
        // =========================

        if (
          wod === "wod1" ||
          wod === "wod4"
        ) {

          const selected =
            document.querySelector(
              'input[name="wodCompleted"]:checked'
            );


          if (!selected) {

            alert(
              "Indica si el WOD fue completado."
            );

            return;

          }


          if (selected.value === "yes") {

            score =
              document
                .getElementById("time")
                .value;


            details = {
              completed: "yes"
            };

          }

          else {

            score =
              document
                .getElementById("reps")
                .value;


            details = {
              completed: "no"
            };

          }

        }


        // =========================
        // WOD 2
        // AMRAP
        // =========================

        else if (wod === "wod2") {

          score =
            document
              .getElementById("amrapReps")
              .value;

        }


        // =========================
        // WOD 3
        // RM
        // =========================

        else if (wod === "wod3") {

          score =
            document
              .getElementById("weight")
              .value;

        }


        if (
          score === undefined ||
          score === null ||
          score === ""
        ) {

          alert(
            "Introduce el resultado."
          );

          return;

        }


        const numericScore =
          Number(score);


        if (
          !Number.isFinite(numericScore) ||
          numericScore < 0
        ) {

          alert(
            "Introduce un resultado válido."
          );

          return;

        }


        // CONTROL CAP

        if (
          wod === "wod1" &&
          details?.completed === "yes" &&
          numericScore > 900
        ) {

          alert(
            "El WOD 1 tiene un cap de 15 minutos (900 segundos)."
          );

          return;

        }


        if (
          wod === "wod4" &&
          details?.completed === "yes" &&
          numericScore > 600
        ) {

          alert(
            "El WOD 4 tiene un cap de 10 minutos (600 segundos)."
          );

          return;

        }


        try {

          const teamRef =
            doc(
              db,
              "teams",
              teamId
            );


          const updatePayload = {};


          updatePayload[
            `scores.${wod}`
          ] = numericScore;


          if (details) {

            updatePayload[
              `details.${wod}`
            ] = details;

          }


          await updateDoc(
            teamRef,
            updatePayload
          );


          alert(
            "Resultado actualizado correctamente."
          );


          scoreForm.reset();


          document
            .querySelectorAll(".wod-fields")
            .forEach(field => {

              field.style.display =
                "none";

            });


          teams =
            await fetchTeams();


          updateParticipantSelect(
            teams
          );


          updateRankings(
            teams
          );


        } catch (error) {

          console.error(
            "Error al actualizar resultado:",
            error
          );


          alert(
            "Error al actualizar el resultado."
          );

        }

      }
    );


    // ===============================
    // BORRAR EQUIPO
    // ===============================

    const deleteButton =
      document.getElementById(
        "deleteParticipant"
      );


    deleteButton.addEventListener(
      "click",
      async () => {

        const teamId =
          participantSelect.value;


        if (!teamId) return;


        const team =
          teams.find(
            team =>
              team.id === teamId
          );


        if (!team) return;


        const confirmation =
          confirm(
            `¿Seguro que quieres borrar el equipo "${team.teamName}"?`
          );


        if (!confirmation) return;


        try {

          const teamRef =
            doc(
              db,
              "teams",
              teamId
            );


          await deleteDoc(
            teamRef
          );


          teams =
            await fetchTeams();


          updateParticipantSelect(
            teams
          );


          updateRankings(
            teams
          );


          alert(
            "Equipo eliminado."
          );


        } catch (error) {

          console.error(
            "Error al borrar equipo:",
            error
          );

        }

      }
    );

  }

});