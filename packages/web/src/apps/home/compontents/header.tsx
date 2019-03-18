import React, {Component} from 'react';
import styled from 'styled-components';

let QMHeader = styled.div`
  background-color: #000000;
  display: flex;
  justify-content: center;
  border-color: blue;
  font-size: 28px;
  color: white;
  border-width: 2px;
  height: 30%;
`;

export default class Header extends Component<{}, {}> {
  render() {
    return (
      <QMHeader>
        <img
          src="https://camo.githubusercontent.com/c073ab551c00db409126fb1518526990528f4d9e/687474703a2f2f6f73732d687a2e7169616e6d692e636f6d2f782d736974652f6465762f646f632f646f6e672f766964656f326465616c2f78736974652f696e746572707265742fe9b9a6e9b9892e706e67"
          alt=""
          style={{marginRight: '10px'}}
          width="50px"
          height="50px"
        />
        翻译师自助发布服务
      </QMHeader>
    );
  }
}
