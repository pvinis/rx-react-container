import React from 'react';
import PropTypes from 'prop-types';

import { mount } from 'enzyme';

import { Observable } from 'rxjs/Observable';
import { Subject } from 'rxjs/Subject';

import 'rxjs/add/observable/merge';
import 'rxjs/add/operator/map';
import 'rxjs/add/operator/first';
import 'rxjs/add/operator/startWith';
import 'rxjs/add/operator/scan';
import 'rxjs/add/operator/switchMap';

import { connect, combineProps } from './index';

function App({ plusOne, minusOne, totalCount, title }) {
  return (
    <div>
      <h1 id="title">{title}</h1>
      <button onClick={minusOne} id="minus">-</button>
      [<span id="count">{totalCount}</span>]
      <button onClick={plusOne} id="plus">+</button>
    </div>
  );
}

App.propTypes = {
  plusOne: PropTypes.func.isRequired,
  minusOne: PropTypes.func.isRequired,
  totalCount: PropTypes.number.isRequired,
  title: PropTypes.string.isRequired,
};

function sampleController(container) {
  const plusOne$ = new Subject();
  const minusOne$ = new Subject();

  const click$ = Observable
    .merge(
      plusOne$.map(() => +1),
      minusOne$.map(() => -1)
    );
  const totalCount$ = container
    .getProp('step')
    .switchMap(step => click$.map(v => v * step))
    .startWith(0)
    .scan((acc, x) => acc + x, 0);

  const title$ = container
    .getProps('step', 'heading')
    .map(([step, heading]) => `${heading} - ${step}`);

  return combineProps({ totalCount$, title$ }, { plusOne$, minusOne$ });
}

const AppContainer = connect(sampleController)(App);

test('connect', (done) => {
  const wrapper = mount(<AppContainer step="1" heading="Test" />);
  expect(wrapper.find('#count').text()).toBe('0');
  expect(wrapper.find('#title').text()).toBe('Test - 1');

  wrapper.find('#plus').simulate('click');

  expect(wrapper.find('#count').text()).toBe('1');
  wrapper.find('#plus').simulate('click');
  wrapper.find('#plus').simulate('click');

  expect(wrapper.find('#count').text()).toBe('3');
  wrapper.find('#minus').simulate('click');
  wrapper.find('#minus').simulate('click');

  expect(wrapper.find('#count').text()).toBe('1');

  wrapper.setProps({ step: 3 });
  expect(wrapper.find('#title').text()).toBe('Test - 3');
  wrapper.find('#plus').simulate('click');
  expect(wrapper.find('#count').text()).toBe('4');
  wrapper.find('#minus').simulate('click');
  expect(wrapper.find('#count').text()).toBe('1');

  wrapper.setProps({ step: 3, heading: 'New' });
  expect(wrapper.find('#title').text()).toBe('New - 3');
  expect(wrapper.find('#count').text()).toBe('1');

  wrapper.setProps({ step: 3 });
  expect(wrapper.find('#title').text()).toBe('New - 3');
  expect(wrapper.find('#count').text()).toBe('1');

  wrapper.unmount();
  done();
});

test('connect to throw if no observable returned', () => {
  expect(
    () => {
      const Cmp = connect(() => 0)(() => null);
      return new Cmp({}, {});
    }
  ).toThrow('controller should return an observable');
});

test('connect - displayName', () => {
  // eslint-disable-next-line prefer-arrow-callback
  const Cmp1 = connect(() => 0)(function Name1() {
  });
  expect(Cmp1.dispalyName).toBe('connect(Name1)');

  const NODE_ENV = process.env.NODE_ENV;
  process.env.NODE_ENV = 'production';

  // eslint-disable-next-line prefer-arrow-callback
  const Cmp2 = connect(() => 0)(function Name2() {
  });
  expect(Cmp2.dispalyName).toBe(undefined);

  process.env.NODE_ENV = NODE_ENV;
});
