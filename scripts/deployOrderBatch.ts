import { toNano } from '@ton/core';
import { OrderBatch } from '../build/OrderBatch/OrderBatch_OrderBatch';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const orderBatch = provider.open(await OrderBatch.fromInit());

    await orderBatch.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(orderBatch.address);

    // run methods on `orderBatch`
}
