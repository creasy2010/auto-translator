import {exec} from 'child_process';
import fs from 'fs';
import fse from 'fs-extra';
import {join} from 'path';
import request from 'request';
import {promisify} from 'util';
import xml2js from 'xml2js';

const _exec = promisify(exec);
const JavaRepoPath = join(__dirname, '../lib');

export const downloadFile = configJson => {
  const {group_id, artifact_id, version, file_type} = configJson;
  const downloadUrl = `http://nexus.dev.qianmi.com/nexus/service/local/artifact/maven/redirect?r=public&g=${group_id}&a=${artifact_id}&v=${version}&e=${file_type}`;
  console.log('下载文件', downloadUrl);
  let stream = fs.createWriteStream(join(JavaRepoPath, `${artifact_id}.jar`));
  return new Promise((resolve, reject) => {
    request(downloadUrl)
      .pipe(stream)
      .on('error', (err: Error) => {
        reject(err);
      })
      .on('close', () => {
        resolve();
      });
  });
};

export const unzipJar = async configJson => {
  console.log('unzipJar..', JavaRepoPath);
  return await __exec(
    `cd ${JavaRepoPath} && jar xvf ${configJson.artifact_id}.jar`,
  );
  // return await __exec(`cd ${jarDir} && unzip -f ${configJson.artifact_id}.jar`);
};

export const analysisDependencies = async configJson => {
  let parser = new xml2js.Parser();
  let builder = new xml2js.Builder();

  const pomDirPath = join(
    JavaRepoPath,
    `META-INF/maven/${configJson.group_id}/${configJson.artifact_id}`,
  );
  const pomXmlPath = join(pomDirPath, 'pom.xml');
  console.log('pomXmlPath...', pomXmlPath);
  const readData = fs.readFileSync(pomXmlPath);

  parser.parseString(readData, (parseErr: any, parseRes: any) => {
    parseRes.project.repositories = {
      repository: {
        id: 'qianmi-public',
        url: 'http://nexus.dev.qianmi.com/nexus/content/groups/public',
        snapshots: {
          enabled: true,
        },
      },
    };
    console.log('parseErr...', parseErr);
    console.log('parseRes...', parseRes);
    let newPomXml = builder.buildObject(parseRes);
    fs.writeFileSync(pomXmlPath, newPomXml);
  });

  let result = await __exec(
    `cd ${pomDirPath} && mvn dependency:copy-dependencies`,
  );
  return result;
};

export async function __exec(
  cmd: string,
): Promise<{stdout: string; stderr: string}> {
  console.log('执行命令::', cmd);
  let result = await _exec(cmd, {cwd: process.env.Pwd});

  if (result.stderr) {
    console.info(result.stdout);
    console.error(result.stderr);
  }

  console.log('成功执行命令::', cmd);
  return result;
}

export const compile = async configJson => {
  const jarPath = join(__dirname, `../lib/${configJson.artifact_id}.jar`);
  const dependencyDirPath = join(
    __dirname,
    `../lib/META-INF/maven/${configJson.group_id}/${
      configJson.artifact_id
    }/target/dependency`,
  );
  const output = join(__dirname, `../packages/${configJson.artifact_id}/src`);
  console.log('output...', output);
  fse.ensureDirSync(output);
  const dubboJsonPath = join(__dirname, '../dubbo.json');
  console.log('dubboJsonPath...', dubboJsonPath);
  fs.writeFileSync(
    dubboJsonPath,
    JSON.stringify({
      output: output,
      entry: `${configJson.entry || configJson.group_id}`,
      entryJarPath: jarPath,
      libDirPath: dependencyDirPath,
    }),
  );

  // await __exec(`./node_modules/interpret-dubbo2js/lib/cli.js -c dubbo.json`);
  await __exec(`interpret -c dubbo.json`);
};

export const npmPublish = async (configJson): Promise<string> => {
  const projectPath = join(__dirname, `../packages/${configJson.artifact_id}`);
  const packageJsonPath = join(projectPath, 'package.json');
  const npmIgnoreJsonPath = join(projectPath, '.npmignore');
  const tsJsonPath = join(projectPath, 'tsconfig.json');

  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify({
      name: `@qianmi/${configJson.artifact_id}`,
      version: `${configJson.version}`,
      author: 'qmfe',
      repository: 'http://git.dev.qianmi.com/QMFE/dubbo-providers',
      description: `@qianmi/${configJson.artifact_id}`,
      license: 'ISC',
      dependencies: {
        'dubbo2.js': '^1.0.0-rc.12',
        'interpret-util': '^0.0.6',
      },
    }),
  );

  fs.writeFileSync(
    npmIgnoreJsonPath,
    `node_modules
src
tsconfig.json`,
  );

  fs.writeFileSync(
    tsJsonPath,
    JSON.stringify({
      extends: '../../tsconfig.json',
      compilerOptions: {
        rootDir: './src/',
        outDir: './lib',
        esModuleInterop: true,
        declaration: true,
      },
      exclude: ['*/__tests__/**', '*/temp/**'],
    }),
  );

  try {
    await __exec(`cd ${projectPath} && rm -rdf ./lib`); //清空lib目录
    await __exec(`cd ${projectPath} && npm install && tsc`);
  } catch (err) {
    console.warn(err);
  }

  //发布失败要重试;;
  let result = await publisUntilSucess(projectPath, configJson.version);
  try {
    await __exec(`rm -rdf ${projectPath}`); //清空目录
    await __exec(`rm  -rdf ${JavaRepoPath} `); //清空目录
  } catch (err) {
    console.warn(err);
  }

  return result;
};

async function publisUntilSucess(
  projectPath: string,
  version,
): Promise<string> {
  let retryCount = 0;
  let result = {stderr: null};
  let _filePath = join(projectPath, 'package.json');
  let json = await fse.readJSON(_filePath);

  do {
    if (retryCount++ > 0) {
      json.version = version + '-' + retryCount;
      console.log(`${projectPath}npm包发送失败:,重试新版本号:${json.version}`);
      await fse.writeJSON(_filePath, json);
    }

    try {
      result = await __exec(
        `cd ${projectPath} && npm publish --registry=http://registry.npm.qianmi.com`,
      );
    } catch (err) {
      // console.log('执行命令出错:: ',err);
      result.stderr = err.message;
    }
  } while (
    result.stderr &&
    result.stderr.includes('cannot modify pre-existing')
  );
  console.log(
    `npm包发布成功:  ${json.name}:${json.version ||
      version} projectPath:${projectPath}`,
  );
  return `${json.name}:${json.version}`;
}

export const translate = async (configJson): Promise<string> => {
  await downloadFile(configJson);
  await unzipJar(configJson);
  await analysisDependencies(configJson);
  await compile(configJson);
  let version = await npmPublish(configJson);

  return version;
};

// (async () => {
//   let configs = [
//     // <dependency>
//     //   <groupId>com.qianmi.courier</groupId>
//     // <artifactId>courier-common</artifactId>
//     // <version>2.0.2-RELEASE</version>
//     // </dependency>

//     {
//       group_id: 'com.qianmi.pc',
//       artifact_id: 'pc-stock-api',
//       version: '1.2.48-RELEASE',
//       file_type: 'jar'
//     }
//     // {
//     //   group_id: 'com.qianmi.admin',
//     //   artifact_id: 'admin-order-api',
//     //   version: '2.0.13-RELEASE',
//     //   entry:"com.qianmi.admin",
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.tc',
//     //   artifact_id: 'd2c-tc-api',
//     //   version: '1.2.3-RELEASE',
//     //   entry:"com.qianmi.d2c.api",
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.uc.connection',
//     //   artifact_id: 'uc-connection-retail-api',
//     //   version: '1.0.2-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.acct',
//     //   artifact_id: 'acct-micro-api',
//     //   version: '1.0.46-beta-10',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.uc',
//     //   artifact_id: 'uc-card-api',
//     //   version: '1.0.5-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.uc',
//     //   artifact_id: 'uc-query-api',
//     //   version: '1.0.31-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'weixin-api',
//     //   version: '1.9.2-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'qmbsc-api',
//     //   version: '1.1.49-RELEASE',
//     //   file_type: 'jar',
//     // },
//     //
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'usercenter-api',
//     //   version: '1.36.21-beta-12',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.ofpay',
//     //   artifact_id: 'acct-api',
//     //   version: '2.34.05-RELEASE',
//     //   entry:"com.ofpay",
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'd2p-common-service-api',
//     //   version: '1.0.16-beta-1',
//     //   entry:"com.qianmi.d2p.common.service.api",
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.mc',
//     //   artifact_id: 'mc-api',
//     //   version: '1.14.3-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.uc',
//     //   artifact_id: 'uc-vrecord-api',
//     //   version: '1.0.3-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //    group_id: 'com.qianmi.acct',
//     //    artifact_id: 'acct-micro-gateway-api',
//     //    version: '1.0.42-RELEASE',
//     //    file_type: 'jar',
//     //  },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'd2p-cart-api',
//     //   version: '1.1.17-RELEASE',
//     //   entry:"com.qianmi.d2p.cart.api",
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'qmbsc-api',
//     //   version: '1.1.49-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'd2p-order-api',
//     //   version: '2.0.87-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.gavin',
//     //   artifact_id: 'gavin-common-api',
//     //   version: '4.0.21-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'weixin-api',
//     //   version: '1.9.2-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi.acct',
//     //   artifact_id: 'acct-micro-gateway-api',
//     //   version: '1.0.42-RELEASE',
//     //   file_type: 'jar',
//     // },
//     // {
//     //   group_id: 'com.qianmi',
//     //   artifact_id: 'acct-pay-new-api',
//     //   version: '1.1.21-RELEASE',
//     //   file_type: 'jar',
//     // },
//   ];
//   let resultes = [];

//   for (var i = 0, iLen = configs.length; i < iLen; i++) {
//     var config = configs[i];
//     try {
//       let versions = await translate(config);
//       versions && resultes.push(versions);
//     } catch (err) {
//       console.log(err);
//     }
//   }

//   for (var i = 0, iLen = resultes.length; i < iLen; i++) {
//     var version = resultes[i];
//     console.log(version);
//   }
//   console.log();
// })();
