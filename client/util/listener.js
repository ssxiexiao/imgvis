'use strict';

let ListenerManager = function() {
    let _doms = new Map();
    let addEventListener = function(dom, event, listener) {
        // console.log(dom, event);
        // All event type listeners
        let all_listeners = _doms.get(dom) || {};
        // Listeners of a particular event
        let listener_list = all_listeners[event] || [];
        // Add the new listener
        listener_list.push(listener);
        all_listeners[event] = listener_list;
        // Save 
        _doms.set(dom, all_listeners);
        // Reset dom event listener
        dom[event] = function(e) {
            let result = {};
            for (let listener of listener_list) {
                result = listener(e, result);
            }
        }
    };

    let deleteEventListener = function(dom, event) {
        // All event type listeners
        let all_listeners = _doms.get(dom);
        if (!all_listeners) return;
            all_listeners[event] = null;
        // Save 
        _doms.set(dom, all_listeners);
        // Reset dom event listener
        dom[event] = null;
    };

    let deleteDom = function(dom) {
        if (_doms.has(dom))
            _doms.delete(dom);
    };

    return { addEventListener, deleteEventListener, deleteDom };
};

export default ListenerManager();