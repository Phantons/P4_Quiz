const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require("./model");

exports.helpCmd = (socket, rl) => {
    log(socket, "Comandos");
    log(socket, "     h|help - Muestra esta ayuda.");
    log(socket, "     list - Listar los quizzes existentes.");
    log(socket, "     show <id> - Muestra la pregunta y la respuesta del quiz indicado.");
    log(socket, "     add - Añadir un nuevo quiz interactivamente.");
    log(socket, "     delete <id> - Borra el quiz indicado.");
    log(socket, "     edit <id> - Editar el quiz indicado.");
    log(socket, "     test <id> - Probar el quiz indicado.");
    log(socket, "     p|play - Jugar a preguntar aleatoriamente todos los quizzes.");
    log(socket, "     credits - Créditos.");
    log(socket, "     q|quit - Salir del programa.");
    rl.prompt();
};

exports.listCmd = (socket, rl) => {
  models.quiz.findAll().each((quiz) => {
      log(socket, `   [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  }).catch(error => {
      errorlog(socket, error.message);
  }).then(() => {
      rl.prompt();
  });
};

const validateId = id => {
  return new Sequelize.Promise ((resolve, reject) => {
     if (typeof id === "undefined") {
         reject(new Error(`Falta el parametro <id>.`));
     }  else {
         id = parseInt(id);
         if (Number.isNaN(id)) {
             reject (new Error(`El valor de parámetro <id> no es un número`));
         } else {
             resolve(id);
         }
     }
  });
};

exports.showCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        log(socket, `   [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
            errorlog(socket, error.message);
        }).then(() => {
            rl.prompt();
    });
};

const makeQuestion = (rl, text) => {
    return new Sequelize.Promise((resolve, reject) => {
        rl.question(colorize(text, 'red'), answer => {
            resolve(answer.trim());
        });
    });
};

exports.addCmd = (socket, rl) => {
    makeQuestion(rl, 'Introduzca una pregunta: ')
    .then(q => {
            return makeQuestion(rl, 'Introduzca una respuesta: ')
            .then(a => {
                    return {question: q, answer: a};
            });
    })
    .then(quiz => {
        return models.quiz.create(quiz);
    })
    .then((quiz) => {
        log(socket, `   [${colorize('Se ha añadido', 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.deleteCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(socket, error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.editCmd = (socket, rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        process.stdout.isTTY && setTimeout(() => {rl.write(quiz.question)}, 0);

        return  makeQuestion(rl, 'Introduzca una pregunta: ')
            .then(q => {
                process.stdout.isTTY && setTimeout(() => {rl.write(quiz.answer)}, 0);
                return makeQuestion(rl, 'Introduzca una respuesta: ')
                    .then(a => {
                        quiz.question = q;
                        quiz.answer = a;
                        return quiz;
                    });
            });
    })
    .then(quiz => {
        return quiz.save();
    })
    .then(quiz => {
        log(socket, `   Se ha cambiado el quiz [${colorize(id, 'magenta')}] por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog(socket, 'El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(socket, error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.testCmd = (socket, rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            return  makeQuestion(rl, `${quiz.question}? `)
                .then(answer => {
                    log(socket, "Su respuesta es:");

                    if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        log(socket, "Correct", "green");
                    } else {
                        log(socket, "Incorrect", "red");
                    }
                });
        })
        .catch(error => {
            errorlog(socket, error.message);
        }).then(() => {
        rl.prompt();
    });
};

function askQuestion(socket, rl, quiz, callback, score) {
    makeQuestion(rl, `${quiz.question}? `)
    .then((answer) => {
        if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
            log(socket, "Correcto");
            score++;
            callback(score);
        } else {
            log(socket, "Incorrecto");
            endOfExam(socket, rl, score);
        }
    });
}

function endOfExam(socket, rl, score) {
    log(socket, "Fin del examen. Aciertos:");
    log(socket, score, 'magenta');
    rl.prompt();
}

exports.playCmd = (socket, rl) => {
    let toBeResolved = [];

    const playOne = (score) => {
        if (toBeResolved.length === 0) {
            //log("No hay mas preguntas");
            endOfExam(socket, rl, score);
        } else {
            let quizToAsk = toBeResolved[Math.floor(Math.random() * toBeResolved.length)];
            toBeResolved.splice(toBeResolved.indexOf(quizToAsk), 1);
            askQuestion(socket, rl, quizToAsk, playOne, score);
        }
    };

    models.quiz.findAll()
        .then(quizzes => {quizzes.forEach(quiz => {toBeResolved.push(quiz);});})
        .then(() => playOne(0))
        .catch(err => console.log(err));
};


exports.creditsCmd = (socket, rl) => {
    log(socket, 'Autor de la práctica:');
    log(socket, "Marcos Collado Martín");
    rl.prompt();
};


exports.quitCmd = (socket, rl) => {
    rl.close();
    socket.end();
};