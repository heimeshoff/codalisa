var editor = ace.edit("editor");
editor.setTheme("ace/theme/dawn");
editor.getSession().setMode("ace/mode/javascript");
editor.getSession().setUseSoftTabs(true);

/**
var keyboardHandler = editor.getKeyboardHandler();
editor.setKeyboardHandler("ace/keyboard/vim");
editor.setKeyboardHandler(keyboardHandler);
*/

var models = {
    scripts: new Scripts(),
    activeScript: new ActiveScript()
};

models.scripts.selected.subscribe(function(name) {
    // When the selected item changes, quickly save the current script :)
    models.activeScript.save(models.scripts, editor.getValue());
    if (!name)
        models.activeScript.clear();
    else 
        models.scripts
            .get(name)
            .then(models.activeScript.set);
});

models.activeScript.script.subscribe(function(script) {
    editor.setValue(script, -1);
});

// Save changes to server periodically
window.setInterval(function() {
    models.activeScript.save(models.scripts, editor.getValue());
}, 5000);

ko.applyBindings(models);
models.scripts.refresh();

var socket = io();

socket.on('scripts-changed', function(msg){
    models.scripts.refresh();
});

editor.focus();
