import Koa from 'koa';
import koabody from 'koa-body';
import Router from 'koa-router';
import render from 'koa-ejs';
import {join} from 'path';
import {translate} from './actor';
import cors from '@koa/cors';
import fse from 'fs-extra';
import staticMiddleWare from 'koa-static';

const app = new Koa();
const router = new Router();

render(app, {
  root: join(__dirname, 'view'),
  layout: 'index',
  viewExt: 'html',
  cache: false,
  debug: true,
});

router.get('/', async (ctx, next) => {
  await (ctx as any).render('index');
});

router.get('/data', async (ctx, next) => {
  ctx.body = 'success';
});

export enum ETransStatue {
  doing = 'doing',
  sucess = 'sucess',
  failture = 'failture',
}

/**
 * status :翻译中;
 * status :翻译成功;
 * status :翻译失败;
 *
 */

let isDoing = false;
router.all('/translate', async (ctx, next) => {
  let {artifactId, entry, groupID, version} = ctx.request.body;

  if (isDoing) {
    ctx.body = {
      data: '',
      status: ETransStatue.doing,
      message: '翻译师正在忙碌翻译中,稍后重试下',
    };
    return;
  } else {
    isDoing = true;
  }

  try {
    let npmVersion = await translate({
      group_id: groupID,
      artifact_id: artifactId,
      entry,
      version,
      file_type: 'jar',
    });
    ctx.body = {
      data: 'npm引用地址:' + npmVersion,
      status: ETransStatue.sucess,
      message: '翻译成功',
    };
    isDoing = false;
  } catch (err) {
    console.log(err);
    ctx.body = {
      data: '翻译失败:',
      status: ETransStatue.sucess,
      message: '翻译失败',
    };
  } finally {
    isDoing = false;
  }
});

app
  .use(cors())
  .use(staticMiddleWare(join(__dirname, '../public')))
  .use(koabody())
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(2000, () => {
    console.log('启动成功 端口 => 2000');
  });

fse.ensureDir(join(__dirname, 'lib'));
