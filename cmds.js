const {log, biglog, errorlog, colorize} = require("./out");

const model = require("./model");

exports.helpCmd = rl => {
    log("Comandos");
    log("     h|help - Muestra esta ayuda.");
    log("     list - Listar los quizzes existentes.");
    log("     show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log("     add - Añadir un nuevo quiz interactivamente.");
    log("     delete <id> - Borra el quiz indicado.");
    log("     edit <id> - Editar el quiz indicado.");
    log("     test <id> - Probar el quiz indicado.");
    log("     p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log("     credits - Créditos.");
    log("     q|quit - Salir del programa.");
    rl.prompt();
};

exports.listCmd = rl => {
  model.getAll().forEach((quiz, id) => {
      log(`   [${colorize(id, 'magenta')}]: ${quiz.question}`);
  });

  rl.prompt();
};

exports.showCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog('Falta el parámetro id.');
    } else {
        try {
            const quiz = model.getByIndex(id);
            log(`   [${colorize(id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
            rl.prompt();
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.addCmd = rl => {
    rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {
        rl.question(colorize(' Introduzca una respuesta: ', 'red'), answer => {
            model.add(question, answer);
            log(`   [${colorize('Se ha añadido', 'magenta')}]: ${question} ${colorize('=>', 'magenta')} ${answer}`);
            rl.prompt();
        });
    });
};

exports.deleteCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog('Falta el parámetro id.');
    } else {
        try {
            model.deleteByIndex(id);
            rl.prompt();
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.editCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog('Falta el parámetro id.');
        rl.prompt();
    } else {
        try {
            const quiz = model.getByIndex(id);

            process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);

            rl.question(colorize(' Introduzca una pregunta: ', 'red'), question => {

                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);

                rl.question(colorize(' Introduzca una respuesta: ', 'red'), answer => {
                    model.update(id, question, answer);
                    log(`   Se ha cambiado el quiz [${colorize(id, 'magenta')}] por: ${question} ${colorize('=>', 'magenta')} ${answer}`);
                    rl.prompt();
                });
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.testCmd = (rl, id) => {
    if (typeof id === "undefined") {
        errorlog('Falta el parámetro id.');
        rl.prompt();
    } else {

        try {
            const quiz = model.getByIndex(id);

            rl.question(`${colorize(quiz.question, 'red')}? `, answer => {

                log("Su respuesta es:");

                if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                    biglog("Correcta", "green");
                } else {
                    biglog("Incorrecta", "red");
                }

                rl.prompt();
            });
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

const playOne = (rl, toBeAsked, score) => {
    if (toBeAsked.length === 0) {
        log("No hay mas preguntas");
        log("Fin del examen. Aciertos:");
        biglog(score, "magenta");
        rl.prompt();
    } else {
        let idAsk = Math.floor(Math.random()*toBeAsked.length);

        try {
            const quiz = model.getByIndex(toBeAsked[idAsk]);
            toBeAsked.splice(idAsk, 1);

            rl.question(`${colorize(quiz.question, 'red')}? `, answer => {

                log("Su respuesta es:");

                if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                    score++;
                    log(`Correcto - Lleva ${score} aciertos.`);
                    playOne(rl, toBeAsked, score);
                } else {
                    log("Incorrecta.");
                    log("Fin del examen. Aciertos:");
                    biglog(score, "magenta");
                    rl.prompt();
                }
            });
        } catch (error) {
            errorlog(error.message);
        }
    }
};

exports.playCmd = rl => {
    let score = 0;

    let toBeAsked = [];
    for (let i = 0; i < model.count(); i++) {
        toBeAsked.push(i);
    }

    if (toBeAsked.length === 0) {
        errorlog("No hay ninguna pregunta!");
        rl.prompt();
    } else {
        playOne(rl, toBeAsked, score);
        rl.prompt();
    }
};

exports.creditsCmd = rl => {
    log('Autor de la práctica:');
    log("Marcos Collado Martín");
    rl.prompt();
};