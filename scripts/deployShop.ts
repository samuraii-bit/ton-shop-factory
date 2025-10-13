import { toNano } from '@ton/core';
import { Shop } from '../build/Shop/Shop_Shop';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const shop = provider.open(await Shop.fromInit());

    await shop.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(shop.address);

    // run methods on `shop`
}
