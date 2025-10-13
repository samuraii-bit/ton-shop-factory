import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano } from '@ton/core';
import { Shop } from '../build/Shop/Shop_Shop';
import '@ton/test-utils';

describe('Shop', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let shop: SandboxContract<Shop>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        shop = blockchain.openContract(await Shop.fromInit());

        deployer = await blockchain.treasury('deployer');

        const deployResult = await shop.send(
            deployer.getSender(),
            {
                value: toNano('0.05'),
            },
            null,
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: shop.address,
            deploy: true,
            success: true,
        });
    });

    it('should deploy', async () => {
        // the check is done inside beforeEach
        // blockchain and shop are ready to use
    });
});
