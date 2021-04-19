
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

    /**
     * WebUSB port
     */
    class Port extends EventTarget {

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
      "P_LAST",
    ];

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

    function getHeader(ctx, ev) {
      const data = new Uint8Array(ev.data);
      // Keep all results in an array until the end, when we can concat them all into a single ArrayBuffer
      ctx.result = [];
      // Set the header
      ctx.header = data;
      // Slot to load from is in 5th index
      ctx.slot = data[5];
      // We're going to be counting how many bytes we have read to know when to stop
      ctx.readBytes = 0;
      // Header contains how many bytes are going to be sent
      ctx.bytesToRead = data[8]+data[9]*256;
      console.log(`Loading from slot: ${ctx.slot} - Expecting ${ctx.bytesToRead} bytes (header: ${ctx.header})`);
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
      ctx.readBytes += data.byteLength;
      return ctx;
    }

    function hasMoreData(ctx) {
      return ctx.readBytes >= ctx.bytesToRead;
    }

    async function sendPatchRequest(ctx) {
      console.log('sendPatchRequest', ctx.port, ctx.patchNumber);
      // [0xf3,0x0f,0xab,0xca,  0,   32,             0,0,0,0 ]
      //  header                get  current preset  padding ]
      const buf = new Uint8Array([0xf3,0x0f,0xab,0xca,0,ctx.patchNumber,0,0,0,0]);
      ctx.port.send(buf);
      return true;
    }

    const PatchLoadMachine = {
      idle: state(
        immediate('getHeader', action(sendPatchRequest)),
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

    ({
      idle: state(
        transition('header')
      )
    });

    const patchLoadMachine = createMachine(PatchLoadMachine, (ctx) => ({ ...ctx }));

    class WebUSBPlinky extends Port {

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

    function parseJSONFromPatch(patch) {
      let JSONPatch = [];
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
        console.log(param, len, idx, "BUF", buf, arr);
        JSONPatch.push({
          name: param,
          value:      arr[0],
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
      return JSONPatch;
    }

    async function connect(ctx) {
      ctx.port = await Serial.requestPort(WebUSBPlinky);
      await ctx.port.connect();
      return ctx;
    }

    function createPlinkyMachine(initialContext = {}) {

      const states = {
        disconnected: state(
          transition('connect', 'connecting', reduce((ctx, ev) => {
            if(ev.patch) {
              const patch = ev.patch;
              const arrayBuffer = patch.buffer.slice(patch.byteOffset, patch.byteLength + patch.byteOffset);
              const patchJSON = parseJSONFromPatch(arrayBuffer);
              return { ...ctx, patchJSON, patch: arrayBuffer }
            }
            return { ...ctx };
          }))
        ),
        connecting: invoke(
          connect,
          transition('done', 'connected'),
          transition('error', 'error', reduce((ctx, ev) => {
            console.log(ev.error);
            return { ...ctx, error: ev.error };
          }))
        ),
        connected: state(
          transition('loadPatch', 'loadPatch', reduce((ctx, ev) => {
            console.log('ctx', ctx, ev);
            return { ...ctx, patchNumber: ev.patchNumber };
          })),
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
            const patchJSON = parseJSONFromPatch(arrayBuffer);
            return { ...ctx, patch: arrayBuffer, patchJSON };
          })),
          transition('error', 'error', reduce((ctx, ev) => {
            return { ...ctx, error: ev.error };
          }))
        ),
        savePatch: state(
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

    const PlinkyMachine = createPlinkyMachine({
      patchNumber: 0,
    });

    /* src/App.svelte generated by Svelte v3.32.1 */

    const { console: console_1 } = globals;
    const file = "src/App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[19] = list[i];
    	return child_ctx;
    }

    // (78:1) {#if error}
    function create_if_block_2(ctx) {
    	let p;
    	let t_value = /*$store*/ ctx[0].context.error + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			attr_dev(p, "class", "error");
    			add_location(p, file, 78, 2, 1733);
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
    		source: "(78:1) {#if error}",
    		ctx
    	});

    	return block;
    }

    // (82:1) {#if !connected}
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
    			add_location(br, file, 82, 55, 1858);
    			attr_dev(a, "href", "https://plinkysynth.com/firmware");
    			add_location(a, file, 82, 59, 1862);
    			add_location(p, file, 82, 2, 1805);
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
    		source: "(82:1) {#if !connected}",
    		ctx
    	});

    	return block;
    }

    // (150:2) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "No patch in browser memory";
    			add_location(p, file, 150, 3, 3783);
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
    		source: "(150:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (96:2) {#if $store.context.patch}
    function create_if_block(ctx) {
    	let button;
    	let t1;
    	let label;
    	let t3;
    	let input;
    	let t4;
    	let p;
    	let t5;
    	let t6_value = /*$store*/ ctx[0].context.patch.byteLength + "";
    	let t6;
    	let t7;
    	let t8;
    	let ul;
    	let mounted;
    	let dispose;
    	let each_value = /*$store*/ ctx[0].context.patchJSON;
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
    			label = element("label");
    			label.textContent = "Link:";
    			t3 = space();
    			input = element("input");
    			t4 = space();
    			p = element("p");
    			t5 = text("Loaded: ");
    			t6 = text(t6_value);
    			t7 = text(" bytes");
    			t8 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(button, "class", "svelte-b06694");
    			add_location(button, file, 97, 3, 2445);
    			attr_dev(label, "for", "i-link-url");
    			add_location(label, file, 99, 3, 2536);
    			input.value = /*linkUrl*/ ctx[4];
    			attr_dev(input, "id", "i-link-url");
    			add_location(input, file, 100, 3, 2577);
    			add_location(p, file, 102, 3, 2621);
    			attr_dev(ul, "class", "params svelte-b06694");
    			add_location(ul, file, 104, 3, 2680);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, label, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, input, anchor);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, p, anchor);
    			append_dev(p, t5);
    			append_dev(p, t6);
    			append_dev(p, t7);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(ul, null);
    			}

    			if (!mounted) {
    				dispose = listen_dev(button, "click", prevent_default(/*clearPatch*/ ctx[8]), false, true, false);
    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*linkUrl*/ 16 && input.value !== /*linkUrl*/ ctx[4]) {
    				prop_dev(input, "value", /*linkUrl*/ ctx[4]);
    			}

    			if (dirty & /*$store*/ 1 && t6_value !== (t6_value = /*$store*/ ctx[0].context.patch.byteLength + "")) set_data_dev(t6, t6_value);

    			if (dirty & /*round, normalise, $store*/ 513) {
    				each_value = /*$store*/ ctx[0].context.patchJSON;
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
    			if (detaching) detach_dev(label);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(input);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t8);
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
    		source: "(96:2) {#if $store.context.patch}",
    		ctx
    	});

    	return block;
    }

    // (106:4) {#each $store.context.patchJSON as param}
    function create_each_block(ctx) {
    	let li;
    	let h3;
    	let t0_value = /*param*/ ctx[19].name + "";
    	let t0;
    	let t1;
    	let div;
    	let table0;
    	let tr0;
    	let td0;
    	let t3;
    	let td1;
    	let t4_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].value)) + "";
    	let t4;
    	let t5;
    	let br0;
    	let t6;
    	let tr1;
    	let td2;
    	let t8;
    	let td3;
    	let t9_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.env)) + "";
    	let t9;
    	let t10;
    	let br1;
    	let t11;
    	let tr2;
    	let td4;
    	let t13;
    	let td5;
    	let t14_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.pressure)) + "";
    	let t14;
    	let t15;
    	let br2;
    	let t16;
    	let tr3;
    	let td6;
    	let t18;
    	let td7;
    	let t19_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.a)) + "";
    	let t19;
    	let t20;
    	let br3;
    	let t21;
    	let table1;
    	let tr4;
    	let td8;
    	let t23;
    	let td9;
    	let t24_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.b)) + "";
    	let t24;
    	let t25;
    	let br4;
    	let t26;
    	let tr5;
    	let td10;
    	let t28;
    	let td11;
    	let t29_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.x)) + "";
    	let t29;
    	let t30;
    	let br5;
    	let t31;
    	let tr6;
    	let td12;
    	let t33;
    	let td13;
    	let t34_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.y)) + "";
    	let t34;
    	let t35;
    	let br6;
    	let t36;
    	let tr7;
    	let td14;
    	let t38;
    	let td15;
    	let t39_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.random)) + "";
    	let t39;
    	let t40;
    	let br7;
    	let t41;

    	const block = {
    		c: function create() {
    			li = element("li");
    			h3 = element("h3");
    			t0 = text(t0_value);
    			t1 = space();
    			div = element("div");
    			table0 = element("table");
    			tr0 = element("tr");
    			td0 = element("td");
    			td0.textContent = "Base";
    			t3 = space();
    			td1 = element("td");
    			t4 = text(t4_value);
    			t5 = text("%");
    			br0 = element("br");
    			t6 = space();
    			tr1 = element("tr");
    			td2 = element("td");
    			td2.textContent = "Env";
    			t8 = space();
    			td3 = element("td");
    			t9 = text(t9_value);
    			t10 = text("%");
    			br1 = element("br");
    			t11 = space();
    			tr2 = element("tr");
    			td4 = element("td");
    			td4.textContent = "Pressure";
    			t13 = space();
    			td5 = element("td");
    			t14 = text(t14_value);
    			t15 = text("%");
    			br2 = element("br");
    			t16 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			td6.textContent = "A";
    			t18 = space();
    			td7 = element("td");
    			t19 = text(t19_value);
    			t20 = text("%");
    			br3 = element("br");
    			t21 = space();
    			table1 = element("table");
    			tr4 = element("tr");
    			td8 = element("td");
    			td8.textContent = "B";
    			t23 = space();
    			td9 = element("td");
    			t24 = text(t24_value);
    			t25 = text("%");
    			br4 = element("br");
    			t26 = space();
    			tr5 = element("tr");
    			td10 = element("td");
    			td10.textContent = "X";
    			t28 = space();
    			td11 = element("td");
    			t29 = text(t29_value);
    			t30 = text("%");
    			br5 = element("br");
    			t31 = space();
    			tr6 = element("tr");
    			td12 = element("td");
    			td12.textContent = "Y";
    			t33 = space();
    			td13 = element("td");
    			t34 = text(t34_value);
    			t35 = text("%");
    			br6 = element("br");
    			t36 = space();
    			tr7 = element("tr");
    			td14 = element("td");
    			td14.textContent = "Random";
    			t38 = space();
    			td15 = element("td");
    			t39 = text(t39_value);
    			t40 = text("%");
    			br7 = element("br");
    			t41 = space();
    			attr_dev(h3, "class", "svelte-b06694");
    			add_location(h3, file, 107, 6, 2762);
    			attr_dev(td0, "class", "svelte-b06694");
    			add_location(td0, file, 111, 9, 2846);
    			add_location(br0, file, 112, 45, 2905);
    			attr_dev(td1, "class", "svelte-b06694");
    			add_location(td1, file, 112, 9, 2869);
    			add_location(tr0, file, 110, 8, 2832);
    			attr_dev(td2, "class", "svelte-b06694");
    			add_location(td2, file, 115, 9, 2951);
    			add_location(br1, file, 116, 48, 3012);
    			attr_dev(td3, "class", "svelte-b06694");
    			add_location(td3, file, 116, 9, 2973);
    			add_location(tr1, file, 114, 8, 2937);
    			attr_dev(td4, "class", "svelte-b06694");
    			add_location(td4, file, 119, 9, 3058);
    			add_location(br2, file, 120, 53, 3129);
    			attr_dev(td5, "class", "svelte-b06694");
    			add_location(td5, file, 120, 9, 3085);
    			add_location(tr2, file, 118, 8, 3044);
    			attr_dev(td6, "class", "svelte-b06694");
    			add_location(td6, file, 123, 9, 3175);
    			add_location(br3, file, 124, 46, 3232);
    			attr_dev(td7, "class", "svelte-b06694");
    			add_location(td7, file, 124, 9, 3195);
    			add_location(tr3, file, 122, 8, 3161);
    			attr_dev(table0, "class", "svelte-b06694");
    			add_location(table0, file, 109, 7, 2816);
    			attr_dev(td8, "class", "svelte-b06694");
    			add_location(td8, file, 129, 9, 3309);
    			add_location(br4, file, 130, 46, 3366);
    			attr_dev(td9, "class", "svelte-b06694");
    			add_location(td9, file, 130, 9, 3329);
    			add_location(tr4, file, 128, 8, 3295);
    			attr_dev(td10, "class", "svelte-b06694");
    			add_location(td10, file, 133, 9, 3412);
    			add_location(br5, file, 134, 46, 3469);
    			attr_dev(td11, "class", "svelte-b06694");
    			add_location(td11, file, 134, 9, 3432);
    			add_location(tr5, file, 132, 8, 3398);
    			attr_dev(td12, "class", "svelte-b06694");
    			add_location(td12, file, 137, 9, 3515);
    			add_location(br6, file, 138, 46, 3572);
    			attr_dev(td13, "class", "svelte-b06694");
    			add_location(td13, file, 138, 9, 3535);
    			add_location(tr6, file, 136, 8, 3501);
    			attr_dev(td14, "class", "svelte-b06694");
    			add_location(td14, file, 141, 9, 3618);
    			add_location(br7, file, 142, 51, 3685);
    			attr_dev(td15, "class", "svelte-b06694");
    			add_location(td15, file, 142, 9, 3643);
    			add_location(tr7, file, 140, 8, 3604);
    			attr_dev(table1, "class", "svelte-b06694");
    			add_location(table1, file, 127, 7, 3279);
    			attr_dev(div, "class", "mods svelte-b06694");
    			add_location(div, file, 108, 6, 2790);
    			attr_dev(li, "class", "svelte-b06694");
    			add_location(li, file, 106, 5, 2751);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, h3);
    			append_dev(h3, t0);
    			append_dev(li, t1);
    			append_dev(li, div);
    			append_dev(div, table0);
    			append_dev(table0, tr0);
    			append_dev(tr0, td0);
    			append_dev(tr0, t3);
    			append_dev(tr0, td1);
    			append_dev(td1, t4);
    			append_dev(td1, t5);
    			append_dev(td1, br0);
    			append_dev(table0, t6);
    			append_dev(table0, tr1);
    			append_dev(tr1, td2);
    			append_dev(tr1, t8);
    			append_dev(tr1, td3);
    			append_dev(td3, t9);
    			append_dev(td3, t10);
    			append_dev(td3, br1);
    			append_dev(table0, t11);
    			append_dev(table0, tr2);
    			append_dev(tr2, td4);
    			append_dev(tr2, t13);
    			append_dev(tr2, td5);
    			append_dev(td5, t14);
    			append_dev(td5, t15);
    			append_dev(td5, br2);
    			append_dev(table0, t16);
    			append_dev(table0, tr3);
    			append_dev(tr3, td6);
    			append_dev(tr3, t18);
    			append_dev(tr3, td7);
    			append_dev(td7, t19);
    			append_dev(td7, t20);
    			append_dev(td7, br3);
    			append_dev(div, t21);
    			append_dev(div, table1);
    			append_dev(table1, tr4);
    			append_dev(tr4, td8);
    			append_dev(tr4, t23);
    			append_dev(tr4, td9);
    			append_dev(td9, t24);
    			append_dev(td9, t25);
    			append_dev(td9, br4);
    			append_dev(table1, t26);
    			append_dev(table1, tr5);
    			append_dev(tr5, td10);
    			append_dev(tr5, t28);
    			append_dev(tr5, td11);
    			append_dev(td11, t29);
    			append_dev(td11, t30);
    			append_dev(td11, br5);
    			append_dev(table1, t31);
    			append_dev(table1, tr6);
    			append_dev(tr6, td12);
    			append_dev(tr6, t33);
    			append_dev(tr6, td13);
    			append_dev(td13, t34);
    			append_dev(td13, t35);
    			append_dev(td13, br6);
    			append_dev(table1, t36);
    			append_dev(table1, tr7);
    			append_dev(tr7, td14);
    			append_dev(tr7, t38);
    			append_dev(tr7, td15);
    			append_dev(td15, t39);
    			append_dev(td15, t40);
    			append_dev(td15, br7);
    			append_dev(li, t41);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*$store*/ 1 && t0_value !== (t0_value = /*param*/ ctx[19].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*$store*/ 1 && t4_value !== (t4_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].value)) + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*$store*/ 1 && t9_value !== (t9_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.env)) + "")) set_data_dev(t9, t9_value);
    			if (dirty & /*$store*/ 1 && t14_value !== (t14_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.pressure)) + "")) set_data_dev(t14, t14_value);
    			if (dirty & /*$store*/ 1 && t19_value !== (t19_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.a)) + "")) set_data_dev(t19, t19_value);
    			if (dirty & /*$store*/ 1 && t24_value !== (t24_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.b)) + "")) set_data_dev(t24, t24_value);
    			if (dirty & /*$store*/ 1 && t29_value !== (t29_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.x)) + "")) set_data_dev(t29, t29_value);
    			if (dirty & /*$store*/ 1 && t34_value !== (t34_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.y)) + "")) set_data_dev(t34, t34_value);
    			if (dirty & /*$store*/ 1 && t39_value !== (t39_value = round(/*normalise*/ ctx[9](/*param*/ ctx[19].mods.random)) + "")) set_data_dev(t39, t39_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(106:4) {#each $store.context.patchJSON as param}",
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
    			attr_dev(h1, "class", "svelte-b06694");
    			add_location(h1, file, 74, 1, 1643);
    			add_location(h20, file, 75, 1, 1678);
    			set_style(button0, "display", !/*connected*/ ctx[1] ? "block" : "none");
    			attr_dev(button0, "class", "svelte-b06694");
    			add_location(button0, file, 85, 1, 1937);
    			attr_dev(label, "for", "i-patch-number");
    			add_location(label, file, 88, 2, 2088);
    			attr_dev(input, "type", "number");
    			input.disabled = /*disabled*/ ctx[2];
    			attr_dev(input, "id", "i-patch-number");
    			add_location(input, file, 89, 2, 2139);
    			button1.disabled = /*disabled*/ ctx[2];
    			attr_dev(button1, "class", "svelte-b06694");
    			add_location(button1, file, 90, 2, 2245);
    			button2.disabled = /*disabled*/ ctx[2];
    			attr_dev(button2, "class", "svelte-b06694");
    			add_location(button2, file, 91, 2, 2316);
    			add_location(h21, file, 93, 2, 2388);
    			set_style(div, "display", /*connected*/ ctx[1] ? "block" : "none");
    			add_location(div, file, 87, 1, 2032);
    			attr_dev(main, "class", "svelte-b06694");
    			add_location(main, file, 73, 0, 1635);
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
    			append_dev(div, t15);
    			append_dev(div, h21);
    			append_dev(div, t17);
    			if_block2.m(div, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*connect*/ ctx[6], false, false, false),
    					listen_dev(input, "input", /*input_input_handler*/ ctx[10]),
    					listen_dev(button1, "click", /*loadPatch*/ ctx[7], false, false, false),
    					listen_dev(button2, "click", savePatch, false, false, false)
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

    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block2) {
    				if_block2.p(ctx, dirty);
    			} else {
    				if_block2.d(1);
    				if_block2 = current_block_type(ctx);

    				if (if_block2) {
    					if_block2.c();
    					if_block2.m(div, null);
    				}
    			}

    			if (dirty & /*connected*/ 2) {
    				set_style(div, "display", /*connected*/ ctx[1] ? "block" : "none");
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

    function savePatch() {
    	
    }

    function round(num) {
    	return Math.round(num * 100 + Number.EPSILON) / 100;
    }

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

    	async function connect() {
    		let params = new URL(document.location).searchParams;
    		let patch = params.get("p");

    		if (patch) {
    			const decodedPatch = decode(decodeURIComponent(patch));
    			console.log("patch: ", patch, decodedPatch);
    			send({ type: "connect", patch: decodedPatch });
    		} else {
    			send({ type: "connect" });
    		}
    	}

    	function loadPatch() {
    		send({
    			type: "loadPatch",
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
    			$$invalidate(4, linkUrl = location.protocol + "//" + location.host + location.pathname + "?p=" + encodeURIComponent(encode(new Uint8Array($store.context.patch))));
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
