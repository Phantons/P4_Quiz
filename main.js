const readline = require('readline');

const model = require('./model');
const cmds = require("./cmds");
const {log, biglog, errorlog, colorize} = require("./out");

biglog('CORE Quiz', 'green');


const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: colorize('quiz > ', 'blue'),
    completer: (line) => {
        const completions = 'h help delete edit list test p play credits q quit'.split(" ");
        const hits = completions.filter((c) => c.startsWith(line));
        return [hits.length ? hits : completions, line];
    }
});

rl.prompt();

rl.on('line', (line) => {

    let args = line.split(" ");
    let cmd = args[0].toLowerCase().trim();

    switch (cmd) {
    case '':
        rl.prompt();
        break;
    case 'help':
    case 'h':
        cmds.helpCmd(rl);
        break;
    case 'list':
        cmds.listCmd(rl);
        break;
    case 'show':
        cmds.showCmd(rl, args[1]);
        break;
    case 'add':
        cmds.addCmd(rl);
        break;
    case 'delete':
        cmds.deleteCmd(rl, args[1]);
        break;
    case 'edit':
        cmds.editCmd(rl, args[1]);
        break;
    case 'test':
        cmds.testCmd(rl, args[1]);
        break;
    case 'play':
    case 'p':
        cmds.playCmd(rl);
        break;
    case 'credits':
        cmds.creditsCmd(rl);
        break;
    case 'quit':
    case 'q':
        rl.close();
        break;
    default:
        log(`Comando desconocido:  '${colorize(cmd, 'red')}'`);
        log(`Use ${colorize('help', 'green')} para ver todos los comandos disponibles.`);
        rl.prompt();
        break;
    }

}).on('close', () => {
    log("Adios!");
    process.exit(0);
});

