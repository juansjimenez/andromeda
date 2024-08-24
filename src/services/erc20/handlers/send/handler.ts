import middy from '@middy/core';
import httpErrorHandler from '@middy/http-error-handler';
import { StatusCodes } from 'http-status-codes';
import {
  APIGatewayProxyEvent,
  Context,
} from 'aws-lambda';
import { Provider } from '@ethersproject/providers';
import doNotWaitForEmptyEventLoop from '@middy/do-not-wait-for-empty-event-loop';
import addPostCors from '../../../../commons/middlewares/cors/add-post-cors';
import HandlerResponse from '../../../../types/handler-response';
import { send } from '../../actions/send';
import loadValuesFromSsm from '../../../../commons/middlewares/ssm/load-values-from-ssm';
import config from '../../../../config';
import loadBlockchainProviderKeysFromSsm from '../../../../commons/middlewares/ssm/load-blockchain-provider-keys-from-ssm';
import errorLogger from '../../../../commons/middlewares/custom/error-logger';
import jsonTextPlainHttpResponseSerializer from '../../../../commons/middlewares/custom/json-text-plain-http-response-serializer';

const {
  walletPrivateKey,
} = config.envVariablesNames;

const middlewares = [
  addPostCors(),
  loadValuesFromSsm({
    params: [
      walletPrivateKey,
    ],
  }),
  doNotWaitForEmptyEventLoop(),
  jsonTextPlainHttpResponseSerializer(),
  loadBlockchainProviderKeysFromSsm(),
  httpErrorHandler(),
  errorLogger(),
];

interface Event extends APIGatewayProxyEvent {
  provider: Provider;
}

export const main = middy(async (
  event: Event,
  context: Context,
): Promise<HandlerResponse> => {
  const {
    body,
    provider,
  } = event;
  const requestBody = JSON.parse(body);

  const hash = await send({
    walletPrivateKey: context[walletPrivateKey],
    web3Provider: provider,
    destinationAddress: requestBody.destinationAddress,
    tokenAddress: requestBody.tokenAddress,
    tokenAmountInWei: requestBody.tokenAmountInWei,
  });

  return {
    statusCode: StatusCodes.OK,
    body: { hash },
  };
}).use(middlewares);
