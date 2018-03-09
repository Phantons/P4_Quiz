const Sequelize = require('sequelize');

const {log, biglog, errorlog, colorize} = require("./out");

const {models} = require("./model");

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
  models.quiz.findAll().each((quiz) => {
      log(`   [${colorize(quiz.id, 'magenta')}]: ${quiz.question}`);
  }).catch(error => {
      errorlog(error.message);
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

exports.showCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.findById(id))
    .then(quiz => {
        if (!quiz) {
            throw new Error(`No existe un quiz asociado al id=${id}.`);
        }

        log(`   [${colorize(quiz.id, 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(error => {
            errorlog(error.message);
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

exports.addCmd = rl => {
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
        log(`   [${colorize('Se ha añadido', 'magenta')}]: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.deleteCmd = (rl, id) => {
    validateId(id)
    .then(id => models.quiz.destroy({where: {id}}))
    .catch(error => {
        errorlog(error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.editCmd = (rl, id) => {
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
        log(`   Se ha cambiado el quiz [${colorize(id, 'magenta')}] por: ${quiz.question} ${colorize('=>', 'magenta')} ${quiz.answer}`);
    })
    .catch(Sequelize.ValidationError, error => {
        errorlog('El quiz es erroneo:');
        error.errors.forEach(({message}) => errorlog(message));
    })
    .catch(error => {
        errorlog(error.message);
    }).then(() => {
        rl.prompt();
    });
};

exports.testCmd = (rl, id) => {
    validateId(id)
        .then(id => models.quiz.findById(id))
        .then(quiz => {
            if (!quiz) {
                throw new Error(`No existe un quiz asociado al id=${id}.`);
            }

            return  makeQuestion(rl, `${quiz.question}? `)
                .then(answer => {
                    log("Su respuesta es:");

                    if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        log("Correct", "green");
                    } else {
                        log("Incorrect", "red");
                    }
                });
        })
        .catch(error => {
            errorlog(error.message);
        }).then(() => {
        rl.prompt();
    });
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
            models.quiz.findById(toBeAsked[idAsk])
            .then((quiz) => {
                makeQuestion(rl, `${quiz.question}? `)
                .then((answer) => {
                    log("Su respuesta es:");

                    if (answer.trim().toLowerCase() === quiz.answer.trim().toLowerCase()) {
                        score++;
                        log(`Correcto - Lleva ${score} aciertos.`);
                        playOne(rl, toBeAsked, score);
                    } else {
                        log("Incorrecta.");
                        log("Fin del examen. Aciertos:");
                        log(score, "magenta");
                        rl.prompt();
                    }
                });
            });

            toBeAsked.splice(idAsk, 1);
        } catch (error) {
            errorlog(error.message);
            rl.prompt();
        }
    }
};

exports.playCmd = rl => {
    let score = 0;

    let toBeAsked = [];
    models.quiz.findAll().each((quiz) => {
        toBeAsked.push(quiz.id);
    })
    .then(() => {
        if (toBeAsked.length === 0) {
            errorlog("No hay ninguna pregunta");
            rl.prompt();
        } else {
            playOne(rl, toBeAsked, score);
            rl.prompt();
        }
    })
    .catch(error => {
        errorlog(error.message);
        rl.prompt();
    });
};

exports.creditsCmd = rl => {
    log('Autor de la práctica:');
    log("Marcos Collado Martín");
    rl.prompt();
};