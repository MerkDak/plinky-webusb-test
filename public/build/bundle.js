
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function prevent_default(fn) {
        return function (event) {
            event.preventDefault();
            // @ts-ignore
            return fn.call(this, event);
        };
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? null : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.32.1' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function valueEnumerable(value) {
      return { enumerable: true, value };
    }

    function valueEnumerableWritable(value) {
      return { enumerable: true, writable: true, value };
    }

    let d = {};
    let truthy = () => true;
    let empty = () => ({});
    let identity = a => a;
    let callBoth = (par, fn, self, args) => par.apply(self, args) && fn.apply(self, args);
    let callForward = (par, fn, self, [a, b]) => fn.call(self, par.call(self, a, b), b);
    let create = (a, b) => Object.freeze(Object.create(a, b));

    function stack(fns, def, caller) {
      return fns.reduce((par, fn) => {
        return function(...args) {
          return caller(par, fn, this, args);
        };
      }, def);
    }

    function fnType(fn) {
      return create(this, { fn: valueEnumerable(fn) });
    }

    let reduceType = {};
    let reduce = fnType.bind(reduceType);
    let action = fn => reduce((ctx, ev) => !!~fn(ctx, ev) && ctx);

    let guardType = {};
    let guard = fnType.bind(guardType);

    function filter(Type, arr) {
      return arr.filter(value => Type.isPrototypeOf(value));
    }

    function makeTransition(from, to, ...args) {
      let guards = stack(filter(guardType, args).map(t => t.fn), truthy, callBoth);
      let reducers = stack(filter(reduceType, args).map(t => t.fn), identity, callForward);
      return create(this, {
        from: valueEnumerable(from),
        to: valueEnumerable(to),
        guards: valueEnumerable(guards),
        reducers: valueEnumerable(reducers)
      });
    }

    let transitionType = {};
    let immediateType = {};
    let transition = makeTransition.bind(transitionType);
    let immediate = makeTransition.bind(immediateType, null);

    function enterImmediate(machine, service, event) {
      return transitionTo(service, machine, event, this.immediates) || machine;
    }

    function transitionsToMap(transitions) {
      let m = new Map();
      for(let t of transitions) {
        if(!m.has(t.from)) m.set(t.from, []);
        m.get(t.from).push(t);
      }
      return m;
    }

    let stateType = { enter: identity };
    function state(...args) {
      let transitions = filter(transitionType, args);
      let immediates = filter(immediateType, args);
      let desc = {
        final: valueEnumerable(args.length === 0),
        transitions: valueEnumerable(transitionsToMap(transitions))
      };
      if(immediates.length) {
        desc.immediates = valueEnumerable(immediates);
        desc.enter = valueEnumerable(enterImmediate);
      }
      return create(stateType, desc);
    }

    let invokePromiseType = {
      enter(machine, service, event) {
        this.fn.call(service, service.context, event)
          .then(data => service.send({ type: 'done', data }))
          .catch(error => service.send({ type: 'error', error }));
        return machine;
      }
    };
    let invokeMachineType = {
      enter(machine, service, event) {
        service.child = interpret(this.machine, s => {
          service.onChange(s);
          if(service.child == s && s.machine.state.value.final) {
            delete service.child;
            service.send({ type: 'done', data: s.context });
          }
        }, service.context, event);
        if(service.child.machine.state.value.final) {
          let data = service.child.context;
          delete service.child;
          return transitionTo(service, machine, { type: 'done', data }, this.transitions.get('done'));
        }
        return machine;
      }
    };
    function invoke(fn, ...transitions) {
      let t = valueEnumerable(transitionsToMap(transitions));
      return machine.isPrototypeOf(fn) ?
        create(invokeMachineType, {
          machine: valueEnumerable(fn),
          transitions: t
        }) :
        create(invokePromiseType, {
          fn: valueEnumerable(fn),
          transitions: t
        });
    }

    let machine = {
      get state() {
        return {
          name: this.current,
          value: this.states[this.current]
        };
      }
    };

    function createMachine(current, states, contextFn = empty) {
      if(typeof current !== 'string') {
        contextFn = states || empty;
        states = current;
        current = Object.keys(states)[0];
      }
      if(d._create) d._create(current, states);
      return create(machine, {
        context: valueEnumerable(contextFn),
        current: valueEnumerable(current),
        states: valueEnumerable(states)
      });
    }

    function transitionTo(service, machine, fromEvent, candidates) {
      let { context } = service;
      for(let { to, guards, reducers } of candidates) {  
        if(guards(context, fromEvent)) {
          service.context = reducers.call(service, context, fromEvent);

          let original = machine.original || machine;
          let newMachine = create(original, {
            current: valueEnumerable(to),
            original: { value: original }
          });

          let state = newMachine.state.value;
          return state.enter(newMachine, service, fromEvent);
        }
      }
    }

    function send(service, event) {
      let eventName = event.type || event;
      let { machine } = service;
      let { value: state } = machine.state;
      
      if(state.transitions.has(eventName)) {
        return transitionTo(service, machine, event, state.transitions.get(eventName)) || machine;
      }
      return machine;
    }

    let service = {
      send(event) {
        this.machine = send(this, event);
        
        // TODO detect change
        this.onChange(this);
      }
    };

    function interpret(machine, onChange, initialContext, event) {
      let s = Object.create(service, {
        machine: valueEnumerableWritable(machine),
        context: valueEnumerableWritable(machine.context(initialContext, event)),
        onChange: valueEnumerable(onChange)
      });
      s.send = s.send.bind(s);
      s.machine = s.machine.state.value.enter(s.machine, s, event);
      return s;
    }

    function unknownState(from, state) {
      throw new Error(`Cannot transition from ${from} to unknown state: ${state}`);
    }

    d._create = function(current, states) {
      if(!(current in states)) {
        throw new Error(`Initial state [${current}] is not a known state.`);
      }
      for(let p in states) {
        let state = states[p];
        for(let [, candidates] of state.transitions) {
          for(let {to} of candidates) {
            if(!(to in states)) {
              unknownState(p, to);
            }
          }
        }
      }
    };

    const {fromCharCode} = String;

    const encode = uint8array => {
      const output = [];
      for (let i = 0, {length} = uint8array; i < length; i++)
        output.push(fromCharCode(uint8array[i]));
      return btoa(output.join(''));
    };

    const asCharCode = c => c.charCodeAt(0);

    const decode = chars => Uint8Array.from(atob(chars), asCharCode);

    // ██╗      ██████╗  █████╗ ██████╗ 
    // ██║     ██╔═══██╗██╔══██╗██╔══██╗
    // ██║     ██║   ██║███████║██║  ██║
    // ██║     ██║   ██║██╔══██║██║  ██║
    // ███████╗╚██████╔╝██║  ██║██████╔╝
    // ╚══════╝ ╚═════╝ ╚═╝  ╚═╝╚═════╝ 

    function getHeader(ctx, ev) {
      const data = new Uint8Array(ev.data);
      // Keep all results in an array until the end, when we can concat them all into a single ArrayBuffer
      ctx.result = [];
      // Set the header
      ctx.header = data;
      // Slot to load from is in 5th index
      ctx.slot = data[5];
      // We're going to be counting how many bytes we have read to know when to stop
      ctx.processedBytes = 0;
      // Header contains how many bytes are going to be sent
      ctx.bytesToProcess = data[8]+data[9]*256;
      console.log(`Loading from slot: ${ctx.slot} - Expecting ${ctx.bytesToProcess} bytes (header: ${ctx.header})`);
      return ctx;
    }

    function hasHeader(ctx, ev) {
      console.log('hasHeader', ctx, ev);
      const data = new Uint8Array(ev.data);
      if(!data) return false;
      if(data.byteLength !== 10) return false;
      if (data[0]!==0xf3) return false;
      if (data[1]!==0x0f) return false;
      if (data[2]!==0xab) return false;
      if (data[3]!==0xca) return false;
      if (data[4]!==1) return false;
      if (data[6]!==0) return false;
      if (data[7]!==0) return false;
      return true;
    }

    function readBytes(ctx, ev) {
      const data = new Uint8Array(ev.data);
      ctx.result.push(data);
      ctx.processedBytes += data.byteLength;
      return ctx;
    }

    function hasMoreData(ctx) {
      return ctx.processedBytes >= ctx.bytesToProcess;
    }

    async function sendLoadRequest(ctx) {
      console.log('sendLoadRequest', ctx.port, 'patchNumber', ctx.patchNumber);
      // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
      //  header                get  current preset  padding ]
      const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,0,ctx.patchNumber,0,0,0,0]);
      ctx.port.send(buf);
      return true;
    }

    const PatchLoadMachine = {
      idle: state(
        immediate('getHeader', action(sendLoadRequest)),
      ),
      getHeader: state(
        transition('data', 'header', guard(hasHeader)),
      ),
      header: state(
        immediate('read', reduce(getHeader))
      ),
      read: state(
        immediate('finished', guard(hasMoreData)),
        transition('data', 'read', reduce(readBytes)),
      ),
      finished: state()
    };

    // ███████╗ █████╗ ██╗   ██╗███████╗
    // ██╔════╝██╔══██╗██║   ██║██╔════╝
    // ███████╗███████║██║   ██║█████╗  
    // ╚════██║██╔══██║╚██╗ ██╔╝██╔══╝  
    // ███████║██║  ██║ ╚████╔╝ ███████╗
    // ╚══════╝╚═╝  ╚═╝  ╚═══╝  ╚══════╝

    async function sendWriteRequest(ctx) {
      console.log('sendWriteRequest', ctx.port, 'patchNumber', ctx.patchNumber);
      // [0xf3,0x0f,0xab,0xca,  1,   32,             0,0,0,0 ]
      //  header                set  current preset  padding ]
      //(header: 243,15,171,202,1,9,0,0,16,6)
      let arr = new ArrayBuffer(4); // an Int32 takes 4 bytes
      let view = new DataView(arr);
      view.setUint32(0, ctx.bytesToProcess, true);
      const len = new Uint8Array(arr);
      const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,1,ctx.patchNumber,0,0,len[0],len[1]]);
      console.log('sending buf', buf, "ctx.bytesToProcess", ctx.bytesToProcess, "len.byteLength", len.byteLength, "len", len);
      ctx.port.send(buf);
      return true;
    }

    const BUFFER_LENGTH = 64;

    async function sendBytes(ctx) {
      const start = ctx.currentIteration * BUFFER_LENGTH;
      const end = start + BUFFER_LENGTH;
      const data = new Uint8Array(ctx.data).slice(start, end);
      ctx.port.send(data);
      ctx.currentIteration++;
      ctx.processedBytes += data.byteLength;
      return ctx;
    }

    const PatchSaveMachine = {
      idle: state(
        immediate('setHeader', reduce(ctx => {
          const data = new Uint8Array(ctx.patch);
          const currentIteration = 0;
          console.log('ctx', ctx, data.byteLength);
          return { ...ctx, processedBytes: 0, bytesToProcess: data.byteLength, data, currentIteration } 
        })),
      ),
      setHeader: state(
        immediate('write', action(sendWriteRequest))
      ),
      getDataFromPatch: state(
        immediate('write', reduce((ctx) => {
          return { ...ctx };
        }))
      ),
      write: state(
        immediate('finished', guard(hasMoreData)),
        immediate('getDataFromPatch', action(sendBytes)),
      ),
      finished: state()
    };

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=}start start and stop notifications for subscriptions
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = [];
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (let i = 0; i < subscribers.length; i += 1) {
                        const s = subscribers[i];
                        s[1]();
                        subscriber_queue.push(s, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.push(subscriber);
            if (subscribers.length === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                const index = subscribers.indexOf(subscriber);
                if (index !== -1) {
                    subscribers.splice(index, 1);
                }
                if (subscribers.length === 0) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /**
     * Wrap an FSM in a Svelte store
     * @param {Machine} machine - Robot3 state machine
     * @param {any} initialContext - Initial context for machine
     * @returns {[Writable<any>, function, Service<any>]}
     */
    const MachineStore = (
      machine,
      initialContext
    ) => {
      const service = interpret(
        machine,
        _service => {
          if(service === _service) {
            console.log('[MachineStore] state', _service.machine.current, 'context', _service.context);
            store.set({ state: _service.machine.current, context: _service.context });
          }
        },
        initialContext,
      );

      const store = writable({
        state: machine.current,
        context: service.context,
      });

      const send = service.send;

      return { store, send, service };
    };

    class Serial {

      constructor() {
      }

      static async getPorts(constructor) {
        return navigator.usb.getDevices().then(devices => {
          return devices.map(device => constructor ? new constructor(device) : new Port(device));
        });
      };

      static async requestPort(constructor) {
        const filters = [
          { 'vendorId': 0x239A }, // Adafruit boards
          { 'vendorId': 0xcafe }, // TinyUSB example
        ];
        return navigator.usb.requestDevice({ 'filters': filters }).then(
          device => new constructor ? new constructor(device) : new Port(device)
        );
      }

    }

    /**
     * WebUSB port
     */
    class Port$1 extends EventTarget {

      constructor(device) {
        super();
        this.device = device;
        this.interfaceNumber = 0;
        this.endpointIn = 0;
        this.endpointOut = 0;
        this.queue = [];
        this.transferInflight = false;
        //this.startQueue();
      }

      onReceive(data) {}
      onReceiveError(error) {}

      setEndpoints() {

        // Go through all the interfaces in this device configuration.
        let interfaces = this.device.configuration.interfaces;

        console.log("Interfaces", this.device.configuration.interfaces);

        interfaces.forEach(element => {
          
          console.log("Element", element);

          // Element alternates - these are the *real* elements
          // that we want to connect to.
          element.alternates.forEach(elementalt => {

          if (elementalt.interfaceClass==0xFF) {

            this.interfaceNumber = element.interfaceNumber;

            // Alternates have endpoints, that we then attach to
            // so we can communicate with the device through
            // a shared pointer.
            elementalt.endpoints.forEach(elementendpoint => {

              if (elementendpoint.direction == "out") {
                this.endpointOut = elementendpoint.endpointNumber;
              }

              if (elementendpoint.direction=="in") {
                this.endpointIn = elementendpoint.endpointNumber;
              }

            });

          }

        });});

        if(this.endpointIn === 0) { console.error('endpointIn is 0'); }    if(this.endpointOut === 0) { console.error('endpointOut is 0'); }
      }

      async connect() {

        let readLoop = async () => {
          try {
            const result = await this.device.transferIn(this.endpointIn, 64);
            this.onReceive(result.data);
            readLoop();
          }
          catch(error) {
            this.onReceiveError(error);
          }
        };

        try {

          // Open the WebUSB device connection
          await this.device.open();

          // Select the passe configuration to that device
          // It is 1 as we are only interested in the first one.
          // We are only connecting to one device here.
          if (this.device.configuration === null) {
            return this.device.selectConfiguration(1);
          }

          // Set the endpoint for that device.
          await this.setEndpoints();

          console.log("Interface number:", this.interfaceNumber);
          console.log("Configuration:", this.device.configuration);

          // Claim the interface to be in use by this app.
          await this.device.claimInterface(this.interfaceNumber);

          try {
            // ??? leftover?
            await this.device.selectAlternateInterface(this.interfaceNumber, this.endpointIn);
          }
          catch(err) {
            //console.error('BOO!!! this.device.selectAlternateInterface() failed');
          }

          await this.device.controlTransferOut({
              'requestType': 'class',
              'recipient': 'interface',
              'request': 0x22,
              'value': 0x01,
              'index': this.interfaceNumber});

          // Start the read loop defined above
          readLoop();
          
        }
        catch(error) {
          console.error(error);
          throw error;
        }

      }

      async disconnect() {
        return this.device.controlTransferOut({
            'requestType': 'class',
            'recipient': 'interface',
            'request': 0x22,
            'value': 0x00,
            'index': this.interfaceNumber})
        .then(() => this.device.close());
      };

      send(data) {
        console.log('sending', data, this.endpointOut);
        return this.device.transferOut(this.endpointOut, data);
      };
      
      queueMessage (data) {
        if (queue.length > 5000) return console.warn('You have queued too many messages, have more chill')
        this.queue.push(data);
      }
      
      async processQueue () {
        // bounce if there's nothing left to do
        if (this.queue.length === 0) return;
        // bounce if we're already sending something and it hasn't been accepted yet
        if (this.transferInflight) return;
        
        this.transferInflight = true;
        
        const data = this.queue.shift();
        try {
          await this.send(data);
        } catch (e) {
          console.error(e);
          this.queue.unshift(data); // naive retry.
        }
        
        this.transferInflight = false;
      }
      
      startQueue () {
        this.stopQueue();
        this.queueInterval = setInterval(this.processQueue.bind(this), 1);
      }
      
      stopQueue () {
        if (this.queueInterval) clearInterval(this.queueInterval);
      }

    }

    class WebUSBPlinky extends Port$1 {

      onReceive(data) {
        console.log('Port data:', data.buffer);
        const { service } = PlinkyMachine;
        if(service.child) {
          service.child.send({
            type: 'data',
            data: data.buffer
          });
        }
        else {
          service.send({
            type: 'data',
            data: data.buffer
          });
        }
      }

      onReceiveError(error) {
        console.error('Port error:', error);
        const { send } = PlinkyMachine;
        send({
          type: 'error',
          data: error
        });
      }

    }

    // This is a list of the params coming from Plinky", in this order.
    // The order is therefore important. It is from params_new.h in the Plinky fw.
    // It is used to translate the TypedArray that we get from the device into JSON.
    const EParams = [
      "P_PWM",
      "P_DRIVE",
      "P_PITCH",
      "P_OCT",
      "P_GLIDE",
      "P_INTERVAL",
      "P_NOISE",
      "P_MIXRESO",
      "P_ROTATE",
      "P_SCALE",
      "P_MICROTUNE",
      "P_STRIDE",
      "P_SENS",
      "P_A",
      "P_D",
      "P_S",
      "P_R",
      "P_ENV1_UNUSED",
      "P_ENV_LEVEL1",
      "P_A2",
      "P_D2",
      "P_S2",
      "P_R2",
      "P_ENV2_UNUSED",
      "P_DLSEND",
      "P_DLTIME",
      "P_DLRATIO",
      "P_DLWOB",
      "P_DLFB",
      "P_TEMPO",
      "P_RVSEND",
      "P_RVTIME",
      "P_RVSHIM",
      "P_RVWOB",
      "P_RVUNUSED",
      "P_SWING",
      "P_ARPONOFF",
      "P_ARPMODE",
      "P_ARPDIV",
      "P_ARPPROB",
      "P_ARPLEN",
      "P_ARPOCT",
      "P_LATCHONOFF",
      "P_SEQMODE",
      "P_SEQDIV",
      "P_SEQPROB",
      "P_SEQLEN",
      "P_GATE_LENGTH",
      "P_SMP_POS",
      "P_SMP_GRAINSIZE",
      "P_SMP_RATE",
      "P_SMP_TIME",
      "P_SAMPLE",
      "P_SEQPAT",
      "P_JIT_POS",
      "P_JIT_GRAINSIZE",
      "P_JIT_RATE",
      "P_JIT_PULSE",
      "P_JIT_UNUSED",
      "P_SEQSTEP",
      "P_ASCALE",
      "P_AOFFSET",
      "P_ADEPTH",
      "P_AFREQ",
      "P_ASHAPE",
      "P_AWARP",
      "P_BSCALE",
      "P_BOFFSET",
      "P_BDEPTH",
      "P_BFREQ",
      "P_BSHAPE",
      "P_BWARP",
      "P_XSCALE",
      "P_XOFFSET",
      "P_XDEPTH",
      "P_XFREQ",
      "P_XSHAPE",
      "P_XWARP",
      "P_YSCALE",
      "P_YOFFSET",
      "P_YDEPTH",
      "P_YFREQ",
      "P_YSHAPE",
      "P_YWARP",
      "P_MIXSYNTH",
      "P_MIXWETDRY",
      "P_MIXHPF",
      "P_MIX_UNUSED",
      "P_CV_QUANT",
      "P_HEADPHONE",
      "P_MIXINPUT",
      "P_MIXINWETDRY",
      "P_SYS_UNUSED1",
      "P_SYS_UNUSED2",
      "P_SYS_UNUSED3",
      "P_ACCEL_SENS",
    ];

    function patch2JSON(patch) {
      let patchJSON = {
        arp: false,
        latch: false,
        loopStart: 0,
        loopLength: 8,
        params: [],
      };
      // each parameter has 16 bytes;
      // first 2 bytes are the value, then the 7 mod matrix amounts
      EParams.forEach((param, index) => {
        // We have 16 bytes that we're looking at
        const len = 16;
        // Index to start slicing at
        const idx = index * len;
        // We have 16 bytes in the ArrayBuffer that we want
        const buf = patch.slice(idx, len*index+len);
        // Then convert it to an Int16Array to get range of -1024 to 1024
        // without having to do messy bit operations by hand! woot!
        const arr = new Int16Array(buf);
        //console.log(param, len, idx, "BUF", buf, arr);
        patchJSON.params.push({
          name: param,
          buffer:     buf,
          value:      arr[0],
          enum:       null,
          mods: {
            env:      arr[1],
            pressure: arr[2],
            a:        arr[3],
            b:        arr[4],
            x:        arr[5],
            y:        arr[6],
            random:   arr[7],
          }
        });
      });

      //
      // Go through the bitfield in the last 16 bytes to set flags
      //
      // u8 flags;
      // - if flags & 1 is true, then arp is on
      // - if flags & 2 is true, then latch is on
      // s8 loopstart_step_no_offset;
      // - 0-63 which step the pattern starts on in the current pattern (normally 0)
      // s8 looplen_step;
      // - how long the pattern is, (normally 8)
      // u8 paddy[16-3];
      // - reserved for future use
      //

      const field = patch.slice(patch.byteLength-16, patch.byteLength);
      patchJSON.arp        = (new Uint8Array(field)[0] & 1) > 0;
      patchJSON.latch      = (new Uint8Array(field)[0] & 2) > 0;
      patchJSON.loopStart  = new Int8Array(field)[1];
      patchJSON.loopLength = new Int8Array(field)[2];

      console.log('bitfield', field, patchJSON);

      return patchJSON;
    }

    const patchLoadMachine = createMachine(PatchLoadMachine, (ctx) => ({ ...ctx }));
    const patchSaveMachine = createMachine(PatchSaveMachine, (ctx) => ({ ...ctx }));

    // ███╗   ███╗ █████╗  ██████╗██╗  ██╗██╗███╗   ██╗███████╗
    // ████╗ ████║██╔══██╗██╔════╝██║  ██║██║████╗  ██║██╔════╝
    // ██╔████╔██║███████║██║     ███████║██║██╔██╗ ██║█████╗  
    // ██║╚██╔╝██║██╔══██║██║     ██╔══██║██║██║╚██╗██║██╔══╝  
    // ██║ ╚═╝ ██║██║  ██║╚██████╗██║  ██║██║██║ ╚████║███████╗
    // ╚═╝     ╚═╝╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚═╝╚═╝  ╚═══╝╚══════╝

    async function connect(ctx) {
      ctx.port = await Serial.requestPort(WebUSBPlinky);
      await ctx.port.connect();
      return ctx;
    }

    function createPlinkyMachine(initialContext = {}) {

      const states = {
        disconnected: state(
          transition('connect', 'connecting'),
          transition('parsePatch', 'disconnected', reduce((ctx, ev) => {
            if(ev.patch) {
              const patch = ev.patch;
              const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
              const patchJSON = patch2JSON(arrayBuffer);
              return { ...ctx, patchJSON, patch: arrayBuffer }
            }
            return { ...ctx };
          }))
        ),
        connecting: invoke(
          connect,
          transition('done', 'connected'),
          transition('error', 'error', reduce((ctx, ev) =>
            ({ ...ctx, error: ev.error })
          ))
        ),
        connected: state(
          transition('loadPatch', 'loadPatch', reduce((ctx, ev) =>
            ({ ...ctx, patchNumber: ev.patchNumber })
          )),
          transition('savePatch', 'savePatch'),
          transition('clearPatch', 'clearPatch'),
        ),
        clearPatch: state(
          immediate('connected', reduce((ctx) => {
            ctx.patch = null;
            ctx.patchJSON = {};
            return { ...ctx }
          }))
        ),
        loadPatch: invoke(
          patchLoadMachine,
          transition('done', 'connected', reduce((ctx, ev) => {
            const patch = Uint8Array.from(Array.prototype.concat(...ev.data.result.map(a => Array.from(a))));
            const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
            const patchJSON = patch2JSON(arrayBuffer);
            return { ...ctx, patch: arrayBuffer, patchJSON };
          })),
          transition('error', 'error', reduce((ctx, ev) => {
            return { ...ctx, error: ev.error };
          }))
        ),
        savePatch: invoke(
          patchSaveMachine,
          transition('done', 'connected'),
          transition('error', 'error', reduce((ctx, ev) => {
            return { ...ctx, error: ev.error };
          }))
        ),
        error: state(
          transition('connect', 'connecting', reduce(ctx => {
            ctx.error = null;
            return { ...ctx };
          })),
        )
      };

      const context = (ctx) => {
        return { ...ctx };
      };

      const machine = createMachine(states, context);

      return MachineStore(machine, Object.assign(initialContext, {
        port: null,
        patch: null,
        patchJSON: {}
      }));
    }

    // ███████╗██╗███╗   ██╗ ██████╗ ██╗     ███████╗████████╗ ██████╗ ███╗   ██╗
    // ██╔════╝██║████╗  ██║██╔════╝ ██║     ██╔════╝╚══██╔══╝██╔═══██╗████╗  ██║
    // ███████╗██║██╔██╗ ██║██║  ███╗██║     █████╗     ██║   ██║   ██║██╔██╗ ██║
    // ╚════██║██║██║╚██╗██║██║   ██║██║     ██╔══╝     ██║   ██║   ██║██║╚██╗██║
    // ███████║██║██║ ╚████║╚██████╔╝███████╗███████╗   ██║   ╚██████╔╝██║ ╚████║
    // ╚══════╝╚═╝╚═╝  ╚═══╝ ╚═════╝ ╚══════╝╚══════╝   ╚═╝    ╚═════╝ ╚═╝  ╚═══╝

    const PlinkyMachine = createPlinkyMachine({
      patchNumber: 0,
    });

    /* src/App.svelte generated by Svelte v3.32.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (93:1) {#if error}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*$store*/ ctx[0].context.error + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error");
    			add_location(p, file, 93, 2, 2222);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$store*/ 1 && t_value !== (t_value = /*$store*/ ctx[0].context.error + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(93:1) {#if error}",
    		ctx
    	});

    	return block;
    }

    // (97:1) {#if !connected}
    function create_if_block_1(ctx) {
    	let p;
    	let t0;
    	let br;
    	let a;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text("You need the 0.9l firmware (or newer) to use this!");
    			br = element("br");
    			a = element("a");
    			a.textContent = "Download here!";
    			add_location(br, file, 97, 55, 2347);
    			attr_dev(a, "href", "https://plinkysynth.com/firmware");
    			add_location(a, file, 97, 59, 2351);
    			add_location(p, file, 97, 2, 2294);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, br);
    			append_dev(p, a);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(97:1) {#if !connected}",
    		ctx
    	});

    	return block;
    }

    // (180:1) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No patch in browser memory";
    			add_location(p, file, 180, 2, 4655);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(180:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (112:1) {#if $store.context.patch}
    function create_if_block(ctx) {
    	let button;
    	let t1;
    	let p0;
    	let t2;
    	let t3_value = /*$store*/ ctx[0].context.patch.byteLength + "";
    	let t3;
    	let t4;
    	let t5;
    	let h30;
    	let t7;
    	let label;
    	let t9;
    	let input;
    	let t10;
    	let h31;
    	let t12;
    	let p1;
    	let t13;
    	let t14_value = /*$store*/ ctx[0].context.patchJSON.arp + "";
    	let t14;
    	let br0;
    	let t15;
    	let t16_value = /*$store*/ ctx[0].context.patchJSON.latch + "";
    	let t16;
    	let br1;
    	let t17;
    	let t18_value = /*$store*/ ctx[0].context.patchJSON.loopStart + "";
    	let t18;
    	let br2;
    	let t19;
    	let t20_value = /*$store*/ ctx[0].context.patchJSON.loopLength + "";
    	let t20;
    	let br3;
    	let t21;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value = /*$store*/ ctx[0].context.patchJSON.params;
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Clear patch in browser memory";
    			t1 = space();
    			p0 = element("p");
    			t2 = text("Loaded: ");
    			t3 = text(t3_value);
    			t4 = text(" bytes");
    			t5 = space();
    			h30 = element("h3");
    			h30.textContent = "Link to patch";
    			t7 = space();
    			label = element("label");
    			label.textContent = "Link:";
    			t9 = space();
    			input = element("input");
    			t10 = space();
    			h31 = element("h3");
    			h31.textContent = "Params";
    			t12 = space();
    			p1 = element("p");
    			t13 = text("Arp: ");
    			t14 = text(t14_value);
    			br0 = element("br");
    			t15 = text("\n\t\t\tLatch: ");
    			t16 = text(t16_value);
    			br1 = element("br");
    			t17 = text("\n\t\t\tLoop start: ");
    			t18 = text(t18_value);
    			br2 = element("br");
    			t19 = text("\n\t\t\tLoop length: ");
    			t20 = text(t20_value);
    			br3 = element("br");
    			t21 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(button, "class", "svelte-1k7gd8d");
    			add_location(button, file, 113, 2, 2939);
    			add_location(p0, file, 115, 2, 3026);
    			add_location(h30, file, 117, 2, 3086);
    			attr_dev(label, "for", "i-link-url");
    			add_location(label, file, 118, 2, 3111);
    			input.value = /*linkUrl*/ ctx[4];
    			attr_dev(input, "id", "i-link-url");
    			add_location(input, file, 119, 2, 3151);
    			add_location(h31, file, 121, 2, 3194);
    			add_location(br0, file, 124, 38, 3255);
    			add_location(br1, file, 125, 42, 3302);
    			add_location(br2, file, 126, 51, 3358);
    			add_location(br3, file, 127, 53, 3416);
    			add_location(p1, file, 123, 2, 3213);
    			attr_dev(ul, "class", "params svelte-1k7gd8d");
    			add_location(ul, file, 130, 2, 3431);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t2);
    			append_dev(p0, t3);
    			append_dev(p0, t4);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, h30, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, label, anchor);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t10, anchor);
    			insert_dev(target, h31, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t13);
    			append_dev(p1, t14);
    			append_dev(p1, br0);
    			append_dev(p1, t15);
    			append_dev(p1, t16);
    			append_dev(p1, br1);
    			append_dev(p1, t17);
    			append_dev(p1, t18);
    			append_dev(p1, br2);
    			append_dev(p1, t19);
    			append_dev(p1, t20);
    			append_dev(p1, br3);
    			insert_dev(target, t21, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*clearPatch*/ ctx[9]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$store*/ 1 && t3_value !== (t3_value = /*$store*/ ctx[0].context.patch.byteLength + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*linkUrl*/ 16 && input.value !== /*linkUrl*/ ctx[4]) {
    				prop_dev(input, "value", /*linkUrl*/ ctx[4]);
    			}

    			if (dirty & /*$store*/ 1 && t14_value !== (t14_value = /*$store*/ ctx[0].context.patchJSON.arp + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*$store*/ 1 && t16_value !== (t16_value = /*$store*/ ctx[0].context.patchJSON.latch + "")) set_data_dev(t16, t16_value);
    			if (dirty & /*$store*/ 1 && t18_value !== (t18_value = /*$store*/ ctx[0].context.patchJSON.loopStart + "")) set_data_dev(t18, t18_value);
    			if (dirty & /*$store*/ 1 && t20_value !== (t20_value = /*$store*/ ctx[0].context.patchJSON.loopLength + "")) set_data_dev(t20, t20_value);

    			if (dirty & /*round, normalise, $store, Uint8Array, Array*/ 1025) {
    				each_value = /*$store*/ ctx[0].context.patchJSON.params;
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(p0);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(h30);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t9);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t10);
    			if (detaching) detach_dev(h31);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(p1);
    			if (detaching) detach_dev(t21);
    			if (detaching) detach_dev(ul);
    			destroy_each(each_blocks, detaching);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(112:1) {#if $store.context.patch}",
    		ctx
    	});

    	return block;
    }

    // (132:3) {#each $store.context.patchJSON.params as param}
    function create_each_block(ctx) {
    	let li;
    	let h3;
    	let t0_value = /*param*/ ctx[20].name + "";
    	let t0;
    	let t1;
    	let code;
    	let t2;
    	let t3_value = Array.from(new Uint8Array(/*param*/ ctx[20].buffer)).map(func) + "";
    	let t3;
    	let br0;
    	let t4;
    	let t5_value = new Uint8Array(/*param*/ ctx[20].buffer).toString() + "";
    	let t5;
    	let t6;
    	let div;
    	let table0;
    	let tr0;
    	let td0;
    	let t8;
    	let td1;
    	let t9_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].value)) + "";
    	let t9;
    	let t10;
    	let br1;
    	let t11;
    	let tr1;
    	let td2;
    	let t13;
    	let td3;
    	let t14_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.env)) + "";
    	let t14;
    	let t15;
    	let br2;
    	let t16;
    	let tr2;
    	let td4;
    	let t18;
    	let td5;
    	let t19_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.pressure)) + "";
    	let t19;
    	let t20;
    	let br3;
    	let t21;
    	let tr3;
    	let td6;
    	let t23;
    	let td7;
    	let t24_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.a)) + "";
    	let t24;
    	let t25;
    	let br4;
    	let t26;
    	let table1;
    	let tr4;
    	let td8;
    	let t28;
    	let td9;
    	let t29_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.b)) + "";
    	let t29;
    	let t30;
    	let br5;
    	let t31;
    	let tr5;
    	let td10;
    	let t33;
    	let td11;
    	let t34_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.x)) + "";
    	let t34;
    	let t35;
    	let br6;
    	let t36;
    	let tr6;
    	let td12;
    	let t38;
    	let td13;
    	let t39_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.y)) + "";
    	let t39;
    	let t40;
    	let br7;
    	let t41;
    	let tr7;
    	let td14;
    	let t43;
    	let td15;
    	let t44_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.random)) + "";
    	let t44;
    	let t45;
    	let br8;
    	let t46;

    	const block = {
    		c: function create() {
    			li = element("li");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			code = element("code");
    			t2 = text("hex: ");
    			t3 = text(t3_value);
    			br0 = element("br");
    			t4 = text("\n\t\t\t\t\t\tdec: ");
    			t5 = text(t5_value);
    			t6 = space();
    			div = element("div");
    			table0 = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Base";
    			t8 = space();
    			td1 = element("td");
    			t9 = text(t9_value);
    			t10 = text("%");
    			br1 = element("br");
    			t11 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "Env";
    			t13 = space();
    			td3 = element("td");
    			t14 = text(t14_value);
    			t15 = text("%");
    			br2 = element("br");
    			t16 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "Pressure";
    			t18 = space();
    			td5 = element("td");
    			t19 = text(t19_value);
    			t20 = text("%");
    			br3 = element("br");
    			t21 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "A";
    			t23 = space();
    			td7 = element("td");
    			t24 = text(t24_value);
    			t25 = text("%");
    			br4 = element("br");
    			t26 = space();
    			table1 = element("table");
    			tr4 = element("tr");
    			td8 = element("td");
    			td8.textContent = "B";
    			t28 = space();
    			td9 = element("td");
    			t29 = text(t29_value);
    			t30 = text("%");
    			br5 = element("br");
    			t31 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = "X";
    			t33 = space();
    			td11 = element("td");
    			t34 = text(t34_value);
    			t35 = text("%");
    			br6 = element("br");
    			t36 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Y";
    			t38 = space();
    			td13 = element("td");
    			t39 = text(t39_value);
    			t40 = text("%");
    			br7 = element("br");
    			t41 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			td14.textContent = "Random";
    			t43 = space();
    			td15 = element("td");
    			t44 = text(t44_value);
    			t45 = text("%");
    			br8 = element("br");
    			t46 = space();
    			attr_dev(h3, "class", "svelte-1k7gd8d");
    			add_location(h3, file, 133, 5, 3517);
    			add_location(br0, file, 135, 77, 3628);
    			attr_dev(code, "class", "svelte-1k7gd8d");
    			add_location(code, file, 134, 5, 3544);
    			attr_dev(td0, "class", "svelte-1k7gd8d");
    			add_location(td0, file, 141, 8, 3757);
    			add_location(br1, file, 142, 44, 3815);
    			attr_dev(td1, "class", "svelte-1k7gd8d");
    			add_location(td1, file, 142, 8, 3779);
    			add_location(tr0, file, 140, 7, 3744);
    			attr_dev(td2, "class", "svelte-1k7gd8d");
    			add_location(td2, file, 145, 8, 3858);
    			add_location(br2, file, 146, 47, 3918);
    			attr_dev(td3, "class", "svelte-1k7gd8d");
    			add_location(td3, file, 146, 8, 3879);
    			add_location(tr1, file, 144, 7, 3845);
    			attr_dev(td4, "class", "svelte-1k7gd8d");
    			add_location(td4, file, 149, 8, 3961);
    			add_location(br3, file, 150, 52, 4031);
    			attr_dev(td5, "class", "svelte-1k7gd8d");
    			add_location(td5, file, 150, 8, 3987);
    			add_location(tr2, file, 148, 7, 3948);
    			attr_dev(td6, "class", "svelte-1k7gd8d");
    			add_location(td6, file, 153, 8, 4074);
    			add_location(br4, file, 154, 45, 4130);
    			attr_dev(td7, "class", "svelte-1k7gd8d");
    			add_location(td7, file, 154, 8, 4093);
    			add_location(tr3, file, 152, 7, 4061);
    			attr_dev(table0, "class", "svelte-1k7gd8d");
    			add_location(table0, file, 139, 6, 3729);
    			attr_dev(td8, "class", "svelte-1k7gd8d");
    			add_location(td8, file, 159, 8, 4202);
    			add_location(br5, file, 160, 45, 4258);
    			attr_dev(td9, "class", "svelte-1k7gd8d");
    			add_location(td9, file, 160, 8, 4221);
    			add_location(tr4, file, 158, 7, 4189);
    			attr_dev(td10, "class", "svelte-1k7gd8d");
    			add_location(td10, file, 163, 8, 4301);
    			add_location(br6, file, 164, 45, 4357);
    			attr_dev(td11, "class", "svelte-1k7gd8d");
    			add_location(td11, file, 164, 8, 4320);
    			add_location(tr5, file, 162, 7, 4288);
    			attr_dev(td12, "class", "svelte-1k7gd8d");
    			add_location(td12, file, 167, 8, 4400);
    			add_location(br7, file, 168, 45, 4456);
    			attr_dev(td13, "class", "svelte-1k7gd8d");
    			add_location(td13, file, 168, 8, 4419);
    			add_location(tr6, file, 166, 7, 4387);
    			attr_dev(td14, "class", "svelte-1k7gd8d");
    			add_location(td14, file, 171, 8, 4499);
    			add_location(br8, file, 172, 50, 4565);
    			attr_dev(td15, "class", "svelte-1k7gd8d");
    			add_location(td15, file, 172, 8, 4523);
    			add_location(tr7, file, 170, 7, 4486);
    			attr_dev(table1, "class", "svelte-1k7gd8d");
    			add_location(table1, file, 157, 6, 4174);
    			attr_dev(div, "class", "mods svelte-1k7gd8d");
    			add_location(div, file, 138, 5, 3704);
    			attr_dev(li, "class", "svelte-1k7gd8d");
    			add_location(li, file, 132, 4, 3507);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, h3);
    			append_dev(h3, t0);
    			append_dev(li, t1);
    			append_dev(li, code);
    			append_dev(code, t2);
    			append_dev(code, t3);
    			append_dev(code, br0);
    			append_dev(code, t4);
    			append_dev(code, t5);
    			append_dev(li, t6);
    			append_dev(li, div);
    			append_dev(div, table0);
    			append_dev(table0, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t8);
    			append_dev(tr0, td1);
    			append_dev(td1, t9);
    			append_dev(td1, t10);
    			append_dev(td1, br1);
    			append_dev(table0, t11);
    			append_dev(table0, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, t13);
    			append_dev(tr1, td3);
    			append_dev(td3, t14);
    			append_dev(td3, t15);
    			append_dev(td3, br2);
    			append_dev(table0, t16);
    			append_dev(table0, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t18);
    			append_dev(tr2, td5);
    			append_dev(td5, t19);
    			append_dev(td5, t20);
    			append_dev(td5, br3);
    			append_dev(table0, t21);
    			append_dev(table0, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, t23);
    			append_dev(tr3, td7);
    			append_dev(td7, t24);
    			append_dev(td7, t25);
    			append_dev(td7, br4);
    			append_dev(div, t26);
    			append_dev(div, table1);
    			append_dev(table1, tr4);
    			append_dev(tr4, td8);
    			append_dev(tr4, t28);
    			append_dev(tr4, td9);
    			append_dev(td9, t29);
    			append_dev(td9, t30);
    			append_dev(td9, br5);
    			append_dev(table1, t31);
    			append_dev(table1, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, t33);
    			append_dev(tr5, td11);
    			append_dev(td11, t34);
    			append_dev(td11, t35);
    			append_dev(td11, br6);
    			append_dev(table1, t36);
    			append_dev(table1, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, t38);
    			append_dev(tr6, td13);
    			append_dev(td13, t39);
    			append_dev(td13, t40);
    			append_dev(td13, br7);
    			append_dev(table1, t41);
    			append_dev(table1, tr7);
    			append_dev(tr7, td14);
    			append_dev(tr7, t43);
    			append_dev(tr7, td15);
    			append_dev(td15, t44);
    			append_dev(td15, t45);
    			append_dev(td15, br8);
    			append_dev(li, t46);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$store*/ 1 && t0_value !== (t0_value = /*param*/ ctx[20].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$store*/ 1 && t3_value !== (t3_value = Array.from(new Uint8Array(/*param*/ ctx[20].buffer)).map(func) + "")) set_data_dev(t3, t3_value);
    			if (dirty & /*$store*/ 1 && t5_value !== (t5_value = new Uint8Array(/*param*/ ctx[20].buffer).toString() + "")) set_data_dev(t5, t5_value);
    			if (dirty & /*$store*/ 1 && t9_value !== (t9_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].value)) + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*$store*/ 1 && t14_value !== (t14_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.env)) + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*$store*/ 1 && t19_value !== (t19_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.pressure)) + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*$store*/ 1 && t24_value !== (t24_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.a)) + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*$store*/ 1 && t29_value !== (t29_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.b)) + "")) set_data_dev(t29, t29_value);
    			if (dirty & /*$store*/ 1 && t34_value !== (t34_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.x)) + "")) set_data_dev(t34, t34_value);
    			if (dirty & /*$store*/ 1 && t39_value !== (t39_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.y)) + "")) set_data_dev(t39, t39_value);
    			if (dirty & /*$store*/ 1 && t44_value !== (t44_value = round(/*normalise*/ ctx[10](/*param*/ ctx[20].mods.random)) + "")) set_data_dev(t44, t44_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(132:3) {#each $store.context.patchJSON.params as param}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let h20;
    	let t2;
    	let t3_value = /*$store*/ ctx[0].state + "";
    	let t3;
    	let t4;
    	let t5;
    	let t6;
    	let button0;
    	let t7;
    	let t8;
    	let div;
    	let label;
    	let t10;
    	let input;
    	let t11;
    	let button1;
    	let t12;
    	let t13;
    	let button2;
    	let t14;
    	let t15;
    	let h21;
    	let t17;
    	let mounted;
    	let dispose;
    	let if_block0 = /*error*/ ctx[3] && create_if_block_2(ctx);
    	let if_block1 = !/*connected*/ ctx[1] && create_if_block_1(ctx);

    	function select_block_type(ctx, dirty) {
    		if (/*$store*/ ctx[0].context.patch) return create_if_block;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block2 = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Plinky WebUSB playground";
    			t1 = space();
    			h20 = element("h2");
    			t2 = text("Current state: ");
    			t3 = text(t3_value);
    			t4 = space();
    			if (if_block0) if_block0.c();
    			t5 = space();
    			if (if_block1) if_block1.c();
    			t6 = space();
    			button0 = element("button");
    			t7 = text("Connect");
    			t8 = space();
    			div = element("div");
    			label = element("label");
    			label.textContent = "Patch number";
    			t10 = space();
    			input = element("input");
    			t11 = space();
    			button1 = element("button");
    			t12 = text("Load patch");
    			t13 = space();
    			button2 = element("button");
    			t14 = text("Save patch");
    			t15 = space();
    			h21 = element("h2");
    			h21.textContent = "Current patch";
    			t17 = space();
    			if_block2.c();
    			attr_dev(h1, "class", "svelte-1k7gd8d");
    			add_location(h1, file, 89, 1, 2132);
    			add_location(h20, file, 90, 1, 2167);
    			set_style(button0, "display", !/*connected*/ ctx[1] ? "block" : "none");
    			attr_dev(button0, "class", "svelte-1k7gd8d");
    			add_location(button0, file, 100, 1, 2426);
    			attr_dev(label, "for", "i-patch-number");
    			add_location(label, file, 103, 2, 2577);
    			attr_dev(input, "type", "number");
    			input.disabled = /*disabled*/ ctx[2];
    			attr_dev(input, "id", "i-patch-number");
    			add_location(input, file, 104, 2, 2628);
    			button1.disabled = /*disabled*/ ctx[2];
    			attr_dev(button1, "class", "svelte-1k7gd8d");
    			add_location(button1, file, 105, 2, 2734);
    			button2.disabled = /*disabled*/ ctx[2];
    			attr_dev(button2, "class", "svelte-1k7gd8d");
    			add_location(button2, file, 106, 2, 2805);
    			set_style(div, "display", /*connected*/ ctx[1] ? "block" : "none");
    			add_location(div, file, 102, 1, 2521);
    			add_location(h21, file, 109, 1, 2884);
    			attr_dev(main, "class", "svelte-1k7gd8d");
    			add_location(main, file, 88, 0, 2124);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, h20);
    			append_dev(h20, t2);
    			append_dev(h20, t3);
    			append_dev(main, t4);
    			if (if_block0) if_block0.m(main, null);
    			append_dev(main, t5);
    			if (if_block1) if_block1.m(main, null);
    			append_dev(main, t6);
    			append_dev(main, button0);
    			append_dev(button0, t7);
    			append_dev(main, t8);
    			append_dev(main, div);
    			append_dev(div, label);
    			append_dev(div, t10);
    			append_dev(div, input);
    			set_input_value(input, /*$store*/ ctx[0].context.patchNumber);
    			append_dev(div, t11);
    			append_dev(div, button1);
    			append_dev(button1, t12);
    			append_dev(div, t13);
    			append_dev(div, button2);
    			append_dev(button2, t14);
    			append_dev(main, t15);
    			append_dev(main, h21);
    			append_dev(main, t17);
    			if_block2.m(main, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*connect*/ ctx[6], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[11]),
    					listen_dev(button1, "click", /*loadPatch*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", /*savePatch*/ ctx[8], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*$store*/ 1 && t3_value !== (t3_value = /*$store*/ ctx[0].state + "")) set_data_dev(t3, t3_value);

    			if (/*error*/ ctx[3]) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2(ctx);
    					if_block0.c();
    					if_block0.m(main, t5);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (!/*connected*/ ctx[1]) {
    				if (if_block1) ; else {
    					if_block1 = create_if_block_1(ctx);
    					if_block1.c();
    					if_block1.m(main, t6);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (dirty & /*connected*/ 2) {
    				set_style(button0, "display", !/*connected*/ ctx[1] ? "block" : "none");
    			}

    			if (dirty & /*disabled*/ 4) {
    				prop_dev(input, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*$store*/ 1 && to_number(input.value) !== /*$store*/ ctx[0].context.patchNumber) {
    				set_input_value(input, /*$store*/ ctx[0].context.patchNumber);
    			}

    			if (dirty & /*disabled*/ 4) {
    				prop_dev(button1, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*disabled*/ 4) {
    				prop_dev(button2, "disabled", /*disabled*/ ctx[2]);
    			}

    			if (dirty & /*connected*/ 2) {
    				set_style(div, "display", /*connected*/ ctx[1] ? "block" : "none");
    			}

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(main, null);
    				}
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			if_block2.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const paramMax = 100;
    const xMax = 1024;

    function compress(input) {
    	return input.split("").reduce(
    		(o, c) => {
    			if (o[o.length - 2] === c && o[o.length - 1] < 35) o[o.length - 1]++; else o.push(c, 0);
    			return o;
    		},
    		[]
    	).map(_ => typeof _ === "number" ? _.toString(36) : _).join("");
    }

    function decompress(input) {
    	return input.split("").map((c, i, a) => i % 2
    	? undefined
    	: new Array(2 + parseInt(a[i + 1], 36)).join(c)).join("");
    }

    function round(num) {
    	return Math.round(num * 100 + Number.EPSILON) / 100;
    }

    const func = a => a.toString(16);

    function instance($$self, $$props, $$invalidate) {
    	let connected;
    	let disabled;
    	let error;
    	let linkUrl;
    	let $store;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let port;
    	let inref;
    	let inarrbufref;
    	let outref;
    	const { store, send, service } = PlinkyMachine;
    	validate_store(store, "store");
    	component_subscribe($$self, store, value => $$invalidate(0, $store = value));

    	onMount(() => {
    		let params = new URL(document.location).searchParams;
    		let patch = params.get("p");

    		if (patch) {
    			const decodedPatch = decode(decompress(decodeURIComponent(patch)));
    			console.log("patch: ", patch, decodedPatch);
    			send({ type: "parsePatch", patch: decodedPatch });
    		}
    	});

    	async function connect() {
    		send("connect");
    	}

    	function loadPatch() {
    		send({
    			type: "loadPatch",
    			patchNumber: $store.context.patchNumber
    		});
    	}

    	function savePatch() {
    		send({
    			type: "savePatch",
    			patchNumber: $store.context.patchNumber
    		});
    	}

    	function clearPatch() {
    		const uri = window.location.toString();

    		if (uri.indexOf("?") > 0) {
    			window.history.replaceState({}, document.title, uri.substring(0, uri.indexOf("?")));
    		}

    		send({ type: "clearPatch" });
    	}

    	const paramMin = -100;
    	const xMin = -1024;

    	function normalise(x) {
    		return (paramMax - paramMin) * ((x - xMin) / (xMax - xMin)) + paramMin;
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input_input_handler() {
    		$store.context.patchNumber = to_number(this.value);
    		store.set($store);
    	}

    	$$self.$capture_state = () => ({
    		encode,
    		decode,
    		onMount,
    		PlinkyMachine,
    		port,
    		inref,
    		inarrbufref,
    		outref,
    		store,
    		send,
    		service,
    		compress,
    		decompress,
    		connect,
    		loadPatch,
    		savePatch,
    		clearPatch,
    		paramMin,
    		paramMax,
    		xMin,
    		xMax,
    		normalise,
    		round,
    		$store,
    		connected,
    		disabled,
    		error,
    		linkUrl
    	});

    	$$self.$inject_state = $$props => {
    		if ("port" in $$props) port = $$props.port;
    		if ("inref" in $$props) inref = $$props.inref;
    		if ("inarrbufref" in $$props) inarrbufref = $$props.inarrbufref;
    		if ("outref" in $$props) outref = $$props.outref;
    		if ("connected" in $$props) $$invalidate(1, connected = $$props.connected);
    		if ("disabled" in $$props) $$invalidate(2, disabled = $$props.disabled);
    		if ("error" in $$props) $$invalidate(3, error = $$props.error);
    		if ("linkUrl" in $$props) $$invalidate(4, linkUrl = $$props.linkUrl);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*$store*/ 1) {
    			$$invalidate(1, connected = ["connected", "loadPatch", "savePatch"].indexOf($store.state) > -1);
    		}

    		if ($$self.$$.dirty & /*$store*/ 1) {
    			$$invalidate(2, disabled = ["loadPatch", "savePatch"].indexOf($store.state) > -1);
    		}

    		if ($$self.$$.dirty & /*$store*/ 1) {
    			$$invalidate(3, error = ["error"].indexOf($store.state) > -1);
    		}

    		if ($$self.$$.dirty & /*$store*/ 1) {
    			$$invalidate(4, linkUrl = location.protocol + "//" + location.host + location.pathname + "?p=" + encodeURIComponent(compress(encode(new Uint8Array($store.context.patch)))));
    		}
    	};

    	return [
    		$store,
    		connected,
    		disabled,
    		error,
    		linkUrl,
    		store,
    		connect,
    		loadPatch,
    		savePatch,
    		clearPatch,
    		normalise,
    		input_input_handler
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
