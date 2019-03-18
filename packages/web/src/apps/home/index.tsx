import React, {Component} from 'react';
import Header from './compontents/header';
import Footer from './compontents/footer';
import Content from './compontents/content';

export default class Home extends Component {
  render() {
    return (
      <div style={{alignContent: 'center'}}>
        <Header />
        <Content />
        <Footer />
      </div>
    );
  }
}
