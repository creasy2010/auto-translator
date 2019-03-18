/**
 * 数据
 * @returns
 */

/**
 * 请求翻译包内容;
 *
 */
// const url = 'http://172.19.77.3:2000';
const url = '';
export interface IInterpretRequest {
  groupID: string;
  artifactId: string;
  version: string;
  entry: string;
}

export interface IInterpretResponse {
  status: ETransStatue;
  data: string;
  message: string;
}

export enum ETransStatue {
  doing = 'doing',
  sucess = 'sucess',
  failture = 'failture',
}

export async function toInterpret(
  requestData: IInterpretRequest,
): Promise<IInterpretResponse> {
  let response = await fetch(`${url}/translate`, {
    method: 'POST',
    body: JSON.stringify(requestData),
    headers: new Headers({
      'Content-Type': 'application/json',
    }),
  });
  return await response.json();
}
