import React, {Component} from 'react';
import {
  message,
  Alert,
  Tooltip,
  Layout,
  Menu,
  Breadcrumb,
  Button,
  Input,
  Row,
  Modal,
  Progress,
  Col,
} from 'antd';
import styled from 'styled-components';
import {toInterpret, ETransStatue} from '../webapi';

let ContentDiv = styled.div`
  display: flex;
  flex-direction: column;
  max-width: 800px;
  padding: 10px;
  justify-content: center;
  align-content: center;
`;

interface IState {
  groupID: string;
  installInfo: string;
  artifactId: string;
  version: string;
  entry: string;
  transState?: ETransStatue;
  isDoing: boolean;
}


export default class Content extends Component<{}, IState> {
  constructor(params) {
    super(params);

    this.state = {
      installInfo: '',
      groupID: 'com.qianmi.pc',
      artifactId: 'pc-stock-api',
      version: '1.2.48-RELEASE',
      entry: 'com.qianmi',
      isDoing: false,
    };
  }
  render() {
    let btnProps = {};
    if (this.state.isDoing) {
      btnProps['disabled'] = 'disabled';
    }
    return (
      <div style={{display: 'flex', justifyContent: 'center'}}>
        <ContentDiv>
          <Tooltip placement="bottomLeft" title="查询jar包信息">
            <a href="http://nexus.dev.ofpay.com/nexus/index.html#welcome">
              nexus
            </a>
          </Tooltip>
          <Input
            style={{padding: 'inherit'}}
            onChange={this.changeValue}
            name="groupID"
            addonBefore="groupID:"
            defaultValue="com.qianmi.pc"
          />
          <Input
            style={{padding: 'inherit'}}
            addonBefore="artifactID:"
            onChange={this.changeValue}
            name="artifactId"
            defaultValue="pc-stock-api"
          />
          <Input
            style={{padding: 'inherit'}}
            addonBefore="jar包版本号:"
            onChange={this.changeValue}
            name="version"
            defaultValue="1.2.48-RELEASE"
          />
          <Input
            style={{padding: 'inherit'}}
            addonBefore="扫描包路径:"
            onChange={this.changeValue}
            name="entry"
            defaultValue="com.qianmi"
          />
          <Button
            {...btnProps}
            style={{padding: 'inherit'}}
            type="primary"
            onClick={this.submit}
          >
            提交
          </Button>
          <div>{this.state.installInfo}</div>
        </ContentDiv>
      </div>
    );
  }

  submit = async () => {
    if (this.state.isDoing) {
      message.warn('正在翻译请稍等!');
      return;
    }
    this.setState({isDoing: true});
    message.info('翻译中,请稍候!');
    let result = await toInterpret({
      groupID: this.state.groupID,
      artifactId: this.state.artifactId,
      version: this.state.version,
      entry: this.state.entry,
    });

    switch (result.status) {
      case ETransStatue.doing:
        message.warning(result.message);
        break;
      case ETransStatue.sucess:
        this.setState({installInfo: result.data});
        message.success(result.data);
        break;
      case ETransStatue.failture:
        message.error(result.data);
        break;
      default:
        message.warning('翻译师一脸蒙逼,不知所措!');
        break;
    }
    this.setState({isDoing: false});
  };
  changeValue = e => {
    //@ts-ignore
    this.setState({[e.target.name]: e.target.value});
  };
}
