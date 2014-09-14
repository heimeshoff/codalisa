/**
 * Binding ACE to our Knockout ViewModel
 *
 * There's a proper way to do this with knockout plugins but I'm too lazy too
 * relearn how that works, so I'm gonna do a whole lot of bindings.
 */

var liveTheme = "ace/theme/dawn";
var roTheme = "ace/theme/kuroir";

function initAce(id) {
    var editor = ace.edit("editor");

    editor.setTheme(liveTheme);
    editor.getSession().setMode("ace/mode/javascript");
    editor.getSession().setUseSoftTabs(true);

    return editor;
}

function initVimPreference(editor, observable) {
    var defaultKeyboardHandler = editor.getKeyboardHandler();
    observable.subscribe(function(useVim) {
        if (useVim)
            editor.setKeyboardHandler("ace/keyboard/vim");
        else
            editor.setKeyboardHandler(defaultKeyboardHandler);
    });
    LocalStorage.register('vim', models.useVim);
};

function bindEditorModel(editor, activeScript) {
    activeScript.script.subscribe(function(script) {
        if (script != editor.getValue()) editor.setValue(script, -1);
    });
    editor.on('change', function() {
        activeScript.script(editor.getValue());
    });
    activeScript.readOnly.subscribe(function(ro) {
        editor.setReadOnly(ro);

        editor.setTheme(ro ? roTheme : liveTheme);
    });
}
