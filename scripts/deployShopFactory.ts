import { toNano } from '@ton/core';
import { ShopFactory } from '../build/ShopFactory/ShopFactory_ShopFactory';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const shopFactory = provider.open(await ShopFactory.fromInit());

    await shopFactory.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(shopFactory.address);

    // run methods on `shopFactory`
}
