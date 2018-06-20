'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var _classCallCheck = _interopDefault(require('babel-runtime/helpers/classCallCheck'));
var _possibleConstructorReturn = _interopDefault(require('babel-runtime/helpers/possibleConstructorReturn'));
var _inherits = _interopDefault(require('babel-runtime/helpers/inherits'));
var React = _interopDefault(require('react'));
var PropTypes = _interopDefault(require('prop-types'));
var rxjs = require('rxjs');
var _Object$keys = _interopDefault(require('babel-runtime/core-js/object/keys'));
var _Object$assign = _interopDefault(require('babel-runtime/core-js/object/assign'));
var operators = require('rxjs/operators');
var hoistStatics = _interopDefault(require('hoist-non-react-statics'));

var RxContainer = function (_React$Component) {
  _inherits(RxContainer, _React$Component);

  RxContainer.getDerivedStateFromProps = function getDerivedStateFromProps(nextProps, prevState) {
    if (nextProps.observable !== prevState.observable) {
      return {
        props: nextProps.initialState,
        observable: nextProps.observable
      };
    }
    return null;
  };

  function RxContainer(props, context) {
    _classCallCheck(this, RxContainer);

    var _this = _possibleConstructorReturn(this, _React$Component.call(this, props, context));

    _this.state = { props: props.initialState, observable: props.observable };
    _this.subscription = null;
    return _this;
  }

  RxContainer.prototype.componentDidMount = function componentDidMount() {
    var _this2 = this;

    // create subscription in componentDidMount instead of componentWillMount
    // because componentWillUnmount is not called server-side
    // which in many cases will result in memory leak
    this.subscription = this.state.observable.subscribe(function (props) {
      _this2.setState({ props: props });
    });
  };

  RxContainer.prototype.componentDidUpdate = function componentDidUpdate(prevProps, prevState) {
    var _this3 = this;

    if (prevState.observable !== this.state.observable) {
      this.subscription.unsubscribe();
      this.subscription = this.props.observable.subscribe(function (props) {
        _this3.setState({ props: props });
      });
    }
  };

  RxContainer.prototype.componentWillUnmount = function componentWillUnmount() {
    this.subscription.unsubscribe();
  };

  RxContainer.prototype.render = function render() {
    return React.createElement(this.props.component, this.state.props);
  };

  return RxContainer;
}(React.Component);

RxContainer.propTypes = {
  component: PropTypes.func.isRequired,
  observable: PropTypes.object.isRequired,
  initialState: PropTypes.object.isRequired
};

function combineLatestObj(obj) {
  var sources = [];
  var keys = [];
  // eslint-disable-next-line no-restricted-syntax
  for (var key in obj) {
    /* istanbul ignore else  */
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      keys.push(key.replace(/\$$/, ''));
      sources.push(obj[key]);
    }
  }
  return rxjs.combineLatest(sources, function () {
    var combination = {};
    for (var i = arguments.length - 1; i >= 0; i -= 1) {
      combination[keys[i]] = arguments.length <= i ? undefined : arguments[i];
    }
    return combination;
  });
}

/**
 * Creates observable combining values from observables, observers(as callbacks) and plain object
 * resulting in Observable of properties to be rendered with react component.
 *
 * @param {Object.<string, Observable>} observables=
 * @param {Object.<string, Observer>} observers=
 * @param {Object} props=
 */
function combineProps(observables, observers, props) {
  var baseProps = _Object$assign({}, props);

  if (observers) {
    _Object$keys(observers).forEach(function (key) {
      baseProps[key.replace(/\$$/, '')] = function (value) {
        observers[key].next(value);
      };
    });
  }

  if (observables && _Object$keys(observables).length > 0) {
    return combineLatestObj(observables).pipe(operators.map(function (newProps) {
      return _Object$assign({}, baseProps, newProps);
    }));
  }

  return rxjs.of(baseProps);
}

/**
 * @deprecated Deprecated in favor of `connect`
 * Creates observable of functions that will create react virtual dom.
 *
 * Parameters:
 *
 *  - `Component` react component to wrap
 *  - `observables` observables with data for component
 *  - `observers` observers to be passed as callbacks to component
 *  - `props` props to pass directly to component
 *
 *  In `observers` and `observables` key names it supports `$`
 *  suffix popularized by Cycle.js (http://cycle.js.org/basic-examples.html#what-does-the-suffixed-dollar-sign-mean).
 *  For example if you pass `name$` stream - data from it would be passed as `name`.
 *
 *  It will create an observable, that will return function for rendering virtual dom with container component.
 *
 *  Container component has state - it is equal to latest combination of data from `observables`,
 *  and will be updated if state changes.
 *
 *  Also container will correctly dispose subscription to observables when unmounted from DOM.
 *
 *  ### Example:
 *
 *  ```JS
 *  import React from 'react';
 *  import {render} from 'react-dom';
 *
 *  import {Subject, Observable} from 'rxjs';
 *  import createContainer from 'rx-react-container';
 *
 *  const plusOne$ = new Subject();
 *  const minusOne$ = new Subject();
 *
 *  const totalCount$ = Observable
 *  .merge(
 *  plusOne$.map(() => +1),
 *  minusOne$.map(() => -1)
 *  )
 *  .startWith(0)
 *  .scan((acc, x) => acc + x, 0);
 *
 *  const App = ({plusOne, minusOne, totalCount}) => {
 *   return (
 *     <div>
 *       <button onClick={minusOne}>-</button>
 *       [{totalCount}]
 *       <button onClick={plusOne}>+</button>
 *     </div>
 *   );
 *  ;
 *
 *  const app$ = createContainer(App, {totalCount$}, {plusOne$, minusOne$});
 *  const appElement = document.getElementById('app');
 *  app$.forEach(renderApp=>render(renderApp(), appElement));
 *
 *  ```
 *
 * @param {React.Component} Component
 * @param {Object.<string, Observable>=} observables
 * @param {Object.<string, Observer>=} observers
 * @param {Object=} props
 */
function createContainer(Component) {
  var observables = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var observers = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  var props = arguments.length > 3 && arguments[3] !== undefined ? arguments[3] : {};

  return rxjs.defer(function () {
    var propsObservable = combineProps(observables, observers, props).pipe(operators.share());

    var initialState = {};

    var renderFn = function renderFn() {
      return React.createElement(RxContainer, {
        props: props,
        initialState: initialState,
        component: Component,
        observable: propsObservable
      });
    };

    return propsObservable.pipe(operators.tap(function (state) {
      _Object$assign(initialState, state);
    }), operators.mapTo(renderFn), operators.distinctUntilChanged());
  });
}

/**
 * @param controller
 * @return {function(*=)}
 */
function connect(controller) {
  return function (Component) {
    var Container = function (_React$Component) {
      _inherits(Container, _React$Component);

      function Container(props, context) {
        _classCallCheck(this, Container);

        var _this = _possibleConstructorReturn(this, _React$Component.call(this, props, context));

        _this.state = { props: null };
        _this.props$ = new rxjs.BehaviorSubject(props);
        _this.subscription = null;
        var stateProps$ = controller(_this);
        if (!stateProps$.subscribe) {
          throw new Error('controller should return an observable');
        }
        _this.stateProps$ = stateProps$.pipe(operators.share());
        // create subscription to get initial data
        // not creating permanent subscription, because componentWillUnmount is not called server-side
        // which in many cases will result in memory leak
        _this.firstSubscription = _this.stateProps$.pipe(operators.first()).subscribe(function (p) {
          var newState = { props: p };
          if (_this.state.props !== null) {
            _this.setState(newState);
          } else {
            _this.state = newState;
          }
        });
        return _this;
      }

      Container.prototype.componentDidMount = function componentDidMount() {
        var _this2 = this;

        this.subscription = this.stateProps$.subscribe(function (props) {
          _this2.setState({ props: props });
        });
        // in case no data was received before first render - remove duplicated subscription
        this.firstSubscription.unsubscribe();
      };

      Container.prototype.componentDidUpdate = function componentDidUpdate() {
        this.props$.next(this.props);
      };

      Container.prototype.componentWillUnmount = function componentWillUnmount() {
        this.subscription.unsubscribe();
      };

      /**
       * Observable with prop by key
       * @param key
       */


      Container.prototype.getProp = function getProp(key) {
        return this.props$.pipe(operators.map(function (props) {
          return props[key];
        }), operators.distinctUntilChanged());
      };

      /**
       * Observable with props by keys
       * @param keys
       */


      Container.prototype.getProps = function getProps() {
        for (var _len = arguments.length, keys = Array(_len), _key = 0; _key < _len; _key++) {
          keys[_key] = arguments[_key];
        }

        return this.props$.pipe(operators.distinctUntilChanged(function (p, q) {
          for (var i = 0, l = keys.length; i < l; i += 1) {
            var name = keys[i];
            if (p[name] !== q[name]) return false;
          }
          return true;
        }), operators.map(function (props) {
          return keys.map(function (key) {
            return props[key];
          });
        }));
      };

      Container.prototype.render = function render() {
        return this.state.props && React.createElement(Component, this.state.props);
      };

      return Container;
    }(React.Component);

    if (process.env.NODE_ENV !== 'production') {
      var name = Component.displayName || Component.name;
      if (name) {
        Container.displayName = 'connect(' + name + ')';
      }
    }

    return hoistStatics(Container, Component);
  };
}

exports.default = createContainer;
exports.connect = connect;
exports.combineProps = combineProps;
//# sourceMappingURL=rx-react-container.cjs.js.map
