import React, {Component} from 'react';
import {render} from 'react-dom';
import {createHashHistory} from 'history';
import {Route, Router} from 'react-router';
import Home from './apps/home';
const history = createHashHistory();

setTimeout(() => {
  throw new Error('mock error!');
}, 5000);

export default class APP extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    return (
      <Router history={history}>
        <div>
          <Route path="/" component={Home} />
        </div>
      </Router>
    );
  }
}

render(<APP />, document.getElementById('react-content'));
