import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { ShopFactory } from '../build/ShopFactory/ShopFactory_ShopFactory';
import '@ton/test-utils';

describe('ShopFactory', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let shopFactory: SandboxContract<ShopFactory>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        shopFactory = blockchain.openContract(await ShopFactory.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: shopFactory.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and shopFactory are ready to use
    });
});
