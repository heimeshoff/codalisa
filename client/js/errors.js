(function() {
    var root;

    window.onerror = function(msg, url, linenr) {
        if (!root) {
            root = document.createElement('div');
            root.style.position = 'absolute';
            root.style.right = '10px';
            root.style.bottom = '10px';
            root.style.background = 'yellow';
            root.style.width = '500px';
            root.style.height = 'auto';
            root.style.padding = '1em';
            document.body.appendChild(root);
        }

        var al = document.createElement('div');
        root.appendChild(al);
        al.outerHTML = '<div style="border-top: solid 1px black; padding: 0.4em 0;">' +
                       url + ':' + linenr +
                       '<br>' + msg + '</div>';
    };
}());

function assert(cond, msg) {
    if (!cond)
        throw new Error("Assertion failure: " + msg);
}
