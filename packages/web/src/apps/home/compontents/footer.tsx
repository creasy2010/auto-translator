import React, {Component} from 'react';
import styled from 'styled-components';
let QMFooter = styled.div`
  display: flex;
  justify-content: center;
`;

export default class Footer extends Component<{}, {}> {
  render() {
    return <QMFooter>©2018 Created by QMFE</QMFooter>;
  }
}
