import { toNano } from '@ton/core';
import { ProductLineItem } from '../build/ProductLineItem/ProductLineItem_ProductLineItem';
import { NetworkProvider } from '@ton/blueprint';

export async function run(provider: NetworkProvider) {
    const productLineItem = provider.open(await ProductLineItem.fromInit());

    await productLineItem.send(
        provider.sender(),
        {
            value: toNano('0.05'),
        },
        null,
    );

    await provider.waitForDeploy(productLineItem.address);

    // run methods on `productLineItem`
}
