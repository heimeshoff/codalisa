var LocalStorage = (function() {
    var handlers = {};

    return {
        register: function(name, observable) {
            var x = window.localStorage.getItem(name);
            if (x !== undefined) {
                observable(JSON.parse(x));
            }

            observable.subscribe(function(value) {
                localStorage.setItem(name, JSON.stringify(value));
            });
        }
    }
}());
