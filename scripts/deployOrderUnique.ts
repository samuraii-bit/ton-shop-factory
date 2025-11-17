import { toNano } from '@ton/core';
import { OrderUnique } from '../build/OrderUnique/OrderUnique_OrderUnique';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const orderUnique = provider.open(await OrderUnique.fromInit());

    await orderUnique.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(orderUnique.address);

    // run methods on `orderUnique`
}
