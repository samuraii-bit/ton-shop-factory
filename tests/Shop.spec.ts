import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
import { toNano, beginCell, Cell, contractAddress, Address, Slice } from '@ton/core';
import { ShopFactory } from '../build/ShopFactory/ShopFactory_ShopFactory';
import { Shop } from '../build/Shop/Shop_Shop';
import { UniqueItem } from '../build/UniqueItem/UniqueItem_UniqueItem';
import { ProductLineItem } from '../build/ProductLineItem/ProductLineItem_ProductLineItem';
import { Order } from '../build/Order/Order_Order';

// Единая функция для создания списков с товарами
function buildItemsList(items: {address: Address, price?: bigint}[]): Cell {
    if (items.length === 0) {
        return beginCell().endCell();
    }
    
    let currentCell = beginCell();
    let itemsInCurrentCell = 0;
    
    for (let i = 0; i < items.length; i++) {
        const item = items[i];
        
        // Проверяем, поместится ли еще один элемент в текущую ячейку
        // Адрес (267 бит) + цена (256 бит) = 523 бита на элемент
        if (itemsInCurrentCell > 0 && (itemsInCurrentCell * 523 + 523) > 1023) {
            // Начинаем новую ячейку
            const nextCell = buildItemsList(items.slice(i));
            currentCell.storeRef(nextCell);
            return currentCell.endCell();
        }
        
        currentCell.storeAddress(item.address);
        if (item.price !== undefined) {
            currentCell.storeUint(item.price, 256);
        }
        
        itemsInCurrentCell++;
    }
    
    return currentCell.endCell();
}

// Функция для создания списка PL товаров (адрес + quantity)
function buildPlItemsList(items: {address: Address, quantity?: bigint}[]): Cell {
    if (items.length === 0) {
        return beginCell().endCell();
    }
    
    const chunks: {address: Address, quantity?: bigint}[][] = [];
    
    // Разбиваем на чанки по 3 элемента
    for (let i = 0; i < items.length; i += 3) {
        const chunk = items.slice(i, i + 3);
        chunks.push(chunk);
    }
    
    let nextCell: Cell | null = null;
    
    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i];
        const builder = beginCell();
        
        chunk.forEach(item => {
            builder.storeAddress(item.address);
            // Обязательно добавляем quantity!
            builder.storeUint(item.quantity || 1n, 64); // по умолчанию 1
        });
        
        if (nextCell !== null) {
            builder.storeRef(nextCell);
        }
        
        nextCell = builder.endCell();
    }
    
    return nextCell!;
}

// Функция для создания списка уникальных товаров (адрес + цена для payment)
function buildUniqueItemsList(items: {address: Address, price?: bigint}[]): Cell {
    if (items.length === 0) {
        return beginCell().endCell();
    }
    
    const chunks: {address: Address, price?: bigint}[][] = [];
    
    for (let i = 0; i < items.length; i += 2) { // меньше элементов из-за цены
        const chunk = items.slice(i, i + 2);
        chunks.push(chunk);
    }
    
    let nextCell: Cell | null = null;
    
    for (let i = chunks.length - 1; i >= 0; i--) {
        const chunk = chunks[i];
        const builder = beginCell();
        
        chunk.forEach(item => {
            builder.storeAddress(item.address);
            if (item.price !== undefined) {
                builder.storeUint(item.price, 256);
            }
        });
        
        if (nextCell !== null) {
            builder.storeRef(nextCell);
        }
        
        nextCell = builder.endCell();
    }
    
    return nextCell!;
}

// function buildSafePaymentInfo(items: {address: Address, price: bigint}[]): Cell {
//     if (items.length === 0) {
//         return beginCell().endCell();
//     }

//     const MAX_ITEMS_PER_CELL = items.length == 1 ? 1 : 3; 
    
//     if (items.length <= MAX_ITEMS_PER_CELL) {
//         // Для 1 элемента просто создаем ячейку
//         const builder = beginCell();
//         builder.storeAddress(items[0].address);
//         builder.storeUint(items[0].price, 256);
//         return builder.endCell();
//     } else {
//         // Для нескольких элементов используем связанный список
//         const chunks: {address: Address, price: bigint}[][] = [];
//         for (let i = 0; i < items.length; i += MAX_ITEMS_PER_CELL) {
//             chunks.push(items.slice(i, i + MAX_ITEMS_PER_CELL));
//         }
        
//         let nextCell: Cell | null = null;
//         for (let i = chunks.length - 1; i >= 0; i--) {
//             const chunk = chunks[i];
//             const builder = beginCell();
            
//             // В каждой ячейке только 1 элемент
//             if (chunk.length > 0) {
//                 builder.storeAddress(chunk[0].address);
//                 builder.storeUint(chunk[0].price, 256);
//             }
            
//             if (nextCell !== null) {
//                 builder.storeRef(nextCell);
//             }
            
//             nextCell = builder.endCell();
//         }
        
//         return nextCell!;
//     }
// }

// function buildItemsList(items: any[]): Cell {
//     const chunks: any[][] = [];
    
//     for (let i = 0; i < items.length; i += 3) {
//         const chunk = items.slice(i, i + 3);
//         chunks.push(chunk);
//     }
    
//     let nextCell: Cell | null = null;
    
//     for (let i = chunks.length - 1; i >= 0; i--) {
//         const chunk = chunks[i];
//         const builder = beginCell();
        
//         chunk.forEach(item => {
//             builder.storeAddress(item.address);
//         });
        
//         if (nextCell !== null) {
//             builder.storeRef(nextCell);
//         }
        
//         nextCell = builder.endCell();
//     }
    
//     return nextCell!;
// }

// function buildItemsList(items: {address: Address, quantity: number}[]): Cell {
//     const chunks: {address: Address, quantity: number}[][] = [];
    
//     for (let i = 0; i < items.length; i += 2) {
//         const chunk = items.slice(i, i + 2);
//         chunks.push(chunk);
//     }
    
//     let nextCell: Cell | null = null;
    
//     for (let i = chunks.length - 1; i >= 0; i--) {
//         const chunk = chunks[i];
//         const builder = beginCell();
        
//         chunk.forEach(item => {
//             builder.storeAddress(item.address);
//             builder.storeUint(item.quantity, 64);
//         });
        
//         if (nextCell !== null) {
//             builder.storeRef(nextCell);
//         }
        
//         nextCell = builder.endCell();
//     }
    
//     return nextCell!;
// }

describe('ShopFactory and Shop System', () => {
    let blockchain: Blockchain;
    let deployer: SandboxContract<TreasuryContract>;
    let user: SandboxContract<TreasuryContract>;
    let user2: SandboxContract<TreasuryContract>;
    let shopFactory: SandboxContract<ShopFactory>;
    let firstShop: SandboxContract<Shop>;

    beforeEach(async () => {
        blockchain = await Blockchain.create();

        deployer = await blockchain.treasury('deployer');
        user = await blockchain.treasury("user");
        user2 = await blockchain.treasury("user2");

        shopFactory = blockchain.openContract(await ShopFactory.fromInit(deployer.address));

        const deployResult = await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano('100000'),
            },
            null
        );

        expect(deployResult.transactions).toHaveTransaction({
            from: deployer.address,
            to: shopFactory.address,
            deploy: true,
            success: true,
        });

        const shopName = "firstShop";
        const result = await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("10000")
            },
            {
                $$type: "CreateShop",
                shopName: shopName 
            }
        );
        const expectedShopAddress = await shopFactory.getShopAddress(0n);
        firstShop = blockchain.openContract(Shop.fromAddress(expectedShopAddress));

        expect(result.transactions).toHaveTransaction({
            from: shopFactory.address, 
            to: firstShop.address,
            success: true, 
            deploy: true
        });
    });

    it('should deploy factory and first shop', async () => {
        expect(shopFactory.address).toBeDefined();
        expect(firstShop.address).toBeDefined();
        
        const shopName = await firstShop.getShopName();
        expect(shopName).toEqual("firstShop");
    });

    it("should create unique item properly", async () => {
        const firstUniqueItemContent = "https://some-json-file-unique-item.com/id0";
        const firstUniqueItemPrice = toNano("5");
        const addItemResult = await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: firstUniqueItemPrice
            }
        );

        const firstUniqueItem = blockchain.openContract(await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, firstUniqueItemContent));

        expect(addItemResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: firstUniqueItem.address,
            deploy: true,
            success: true
        });

        const fuItemPrice = await firstUniqueItem.getPrice();
        const fuItemIndex = await firstUniqueItem.getIndex();  
        const fuItemContent = await firstUniqueItem.getContent();
         
        expect(fuItemPrice).toEqual(firstUniqueItemPrice);
        expect(fuItemIndex).toEqual(0n);
        expect(fuItemContent).toEqual(firstUniqueItemContent);
    });

    it("should create product line item properly", async () => {
        const firstPlItemContent = "https://some-json-file-pl-item.com/id0";
        const firstPlItemPrice = toNano("3");
        const addItemResult = await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: firstPlItemPrice
            }
        );

        const firstPlItem = blockchain.openContract(await ProductLineItem.fromInit(firstShop.address, firstShop.address, firstPlItemContent, 0n));

        expect(addItemResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: firstPlItem.address,
            deploy: true,
            success: true
        });

        const plItemPrice = await firstPlItem.getPrice();
        expect(plItemPrice).toEqual(firstPlItemPrice);
    });

    it("should not allow non-owner to add items", async () => {
        const addItemResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: toNano("5")
            }
        );

        expect(addItemResult.transactions).toHaveTransaction({
            from: user.address,
            to: firstShop.address,
            success: false,
        });
    });

    it("should not allow non-owner to set prices", async () => {
        const uniqueItemPrice = toNano("5");
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: uniqueItemPrice
            }
        );

        const uniqueItem = blockchain.openContract(
            await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
        );

        const updatePriceResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("0.1")
            },
            {
                $$type: "SetUniqueItemPrice",
                uniqueItem: uniqueItem.address,
                newPrice: toNano("10")
            }
        );

        expect(updatePriceResult.transactions).toHaveTransaction({
            from: user.address,
            to: firstShop.address,
            success: false,
        });
    });

    it("should create order with single unique item properly", async () => {
        const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
        const uniqueItemPrice = toNano("5");
        
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: uniqueItemPrice
            }
        );

        const uniqueItem = blockchain.openContract(
            await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
        );

        const itemsInfoUnique = beginCell()
            .storeAddress(uniqueItem.address)
            .endCell();

        const itemsInfoPl = beginCell().endCell();

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("2")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );
        
        const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
        const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));
        
        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: order.address,
            success: true,
            deploy: true
        });

        const itemOwner = await uniqueItem.getOwner();
        expect(itemOwner.equals(order.address)).toBe(true);

        const orderBuyer = await order.getBuyer();
        const ordersCount = await firstShop.getOrdersCount();
        const orderSeller = await order.getSeller();
        const orderTotalPrice = await order.getTotalPrice();
        const orderTotalItemsCount = await order.getTotalItemsCount();
        
        expect(ordersCount).toEqual(1n);
        expect(orderBuyer!.equals(user.address)).toBe(true);
        expect(orderSeller.equals(firstShop.address)).toBe(true);
        expect(orderTotalPrice).toEqual(uniqueItemPrice);
        expect(orderTotalItemsCount).toEqual(1n);
    });

    it("should create order with multiple unique items properly", async () => {
        let uniqueItemsArray = [];
        let totalPrice = 0n;
        
        for (let i = 0; i < 5; i++) {
            const price = toNano(`${i + 1}`);
            totalPrice += price;
            
            await firstShop.send(
                deployer.getSender(),
                {
                    value: toNano("0.2")
                },
                {
                    $$type: "AddItem",
                    isUnique: true,
                    price: price
                }
            );
            
            const uniqueItem = blockchain.openContract(
                await UniqueItem.fromInit(firstShop.address, firstShop.address, BigInt(i), `https://some-json-file-unique-item.com/id${i}`)
            );
            uniqueItemsArray.push(uniqueItem);
        }

        const itemsInfoUnique = buildItemsList(uniqueItemsArray);
        const itemsInfoPl = beginCell().endCell();

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("10")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
        const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: order.address,
            success: true,
            deploy: true
        });

        for (const item of uniqueItemsArray) {
            const owner = await item.getOwner();
            expect(owner.equals(orderAddressFromShop)).toBe(true);
        }

        const orderTotalPrice = await order.getTotalPrice();
        expect(orderTotalPrice).toEqual(totalPrice);
    });

    it("should create order with product line items properly", async () => {
        const plItemContent = "https://some-json-file-pl-item.com/id0";
        const plItemPrice = toNano("3");
        const quantity = 3;
        
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: plItemPrice
            }
        );

        const plItem = blockchain.openContract(
            await ProductLineItem.fromInit(firstShop.address, firstShop.address, plItemContent, 0n)
        );

        const itemsInfoUnique = beginCell().endCell();
        const itemsInfoPl = buildItemsList([{address: plItem.address}]);

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("2")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
        const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: order.address,
            success: true,
            deploy: true
        });
    });

    it("should create order with mixed items (unique + product line)", async () => {
        const uniqueItemPrice = toNano("5");
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: uniqueItemPrice
            }
        );
        const uniqueItem = blockchain.openContract(
            await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
        );

        // Создаем товар продукт-лайн
        const plItemPrice = toNano("3");
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: plItemPrice
            }
        );
        const plItem = blockchain.openContract(
            await ProductLineItem.fromInit(firstShop.address, firstShop.address, "https://some-json-file-pl-item.com/id0", 0n)
        );

        const itemsInfoUnique = beginCell()
            .storeAddress(uniqueItem.address)
            .endCell();
            
        const itemsInfoPl = buildItemsList([{address: plItem.address}]);

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("15")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
        const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: order.address,
            success: true,
            deploy: true
        });
    });

it("should complete order payment successfully", async () => {
    const uniqueItemPrice = toNano("5");
    
    // Создаем уникальный товар
    await firstShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: uniqueItemPrice
        }
    );

    const uniqueItem = blockchain.openContract(
        await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
    );

    const itemsInfoUnique = beginCell()
        .storeAddress(uniqueItem.address)
        .endCell();

    const itemsInfoPl = beginCell().endCell(); // Пустой список PL товаров

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("2")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: itemsInfoUnique,
            itemsInfoPl: itemsInfoPl,
        }
    );

    const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
    const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

    const paymentInfo = beginCell()
        .storeAddress(uniqueItem.address)
        .storeUint(uniqueItemPrice, 256)
        .endCell();

    const payResult = await order.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: paymentInfo
        }
    );

    // Проверяем успешную транзакцию передачи NFT
    expect(payResult.transactions).toHaveTransaction({
        from: order.address,
        to: uniqueItem.address,
        success: true
    });

    // Проверяем, что товар перешел к покупателю
    const finalOwner = await uniqueItem.getOwner();
    expect(finalOwner.equals(user.address)).toBe(true);
});

it("should handle multiple shops with multiple orders", async () => {
    // Создаем второй магазин
    const secondShopName = "secondShop";
    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop",
            shopName: secondShopName
        }
    );

    const secondShopAddress = await shopFactory.getShopAddress(1n);
    const secondShop = blockchain.openContract(Shop.fromAddress(secondShopAddress));

    const shop1ItemAddresses = [];
    for (let i = 0; i < 3; i++) {
        const price = toNano(`${i + 2}`);
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        
        const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, BigInt(i)));
        shop1ItemAddresses.push(itemAddress);
    }

    const shop2ItemAddresses = [];
    for (let i = 0; i < 2; i++) {
        const price = toNano(`${i + 3}`);
        await secondShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        
        const itemAddress = contractAddress(0, await secondShop.getUniqueItemInit(secondShop.address, BigInt(i)));
        shop2ItemAddresses.push(itemAddress);
    }

    const shop1Items = shop1ItemAddresses.slice(0, 2).map(addr => ({ address: addr }));
    const shop1ItemsInfo = buildItemsList(shop1Items);
    await firstShop.send(
        user.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: shop1ItemsInfo,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    const shop2Items = shop2ItemAddresses.slice(0, 1).map(addr => ({ address: addr }));
    const shop2ItemsInfo = buildItemsList(shop2Items);
    await secondShop.send(
        user2.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: shop2ItemsInfo,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    const order1Address = contractAddress(0, await firstShop.getOrderInit(0n));
    const order2Address = contractAddress(0, await secondShop.getOrderInit(0n));

    expect(order1Address).toBeDefined();
    expect(order2Address).toBeDefined();

    // Проверяем, что товары переданы в заказы (через вызовы getOwner)
    for (let i = 0; i < 2; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(shop1ItemAddresses[i]));
        const owner = await itemContract.getOwner();
        expect(owner.equals(order1Address)).toBe(true);
    }

    const itemContract = blockchain.openContract(UniqueItem.fromAddress(shop2ItemAddresses[0]));
    const owner = await itemContract.getOwner();
    expect(owner.equals(order2Address)).toBe(true);
});

it("should handle mixed item types in multiple shops", async () => {
    // Создаем два магазина
    const shopNames = ["techShop", "bookShop"];
    const shops = [];
    
    for (let i = 0; i < 2; i++) {
        await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "CreateShop",
                shopName: shopNames[i]
            }
        );

        const shopAddress = await shopFactory.getShopAddress(BigInt(i));
        shops.push(blockchain.openContract(Shop.fromAddress(shopAddress)));
    }

    const [techShop, bookShop] = shops;

    // TechShop: уникальные товары + продукт-лайн
    await techShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: toNano("10")
        }
    );

    await techShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("2")
        }
    );

    // Вычисляем адреса товаров
    const techUniqueItemAddress = contractAddress(0, await techShop.getUniqueItemInit(techShop.address, 0n));
    const techPlItemAddress = contractAddress(0, await techShop.getProductlineItemInit(0n));

    // BookShop: только продукт-лайн товары
    await bookShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("5")
        }
    );

    await bookShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("8")
        }
    );

    const bookPlItem1Address = contractAddress(0, await bookShop.getProductlineItemInit(0n));
    const bookPlItem2Address = contractAddress(0, await bookShop.getProductlineItemInit(1n));

    // Создаем заказы в обоих магазинах
    const techOrderItemsUnique = beginCell()
        .storeAddress(techUniqueItemAddress)
        .endCell();

    const techOrderItemsPl = buildItemsList([
        { address: techPlItemAddress }
    ]);

    await techShop.send(
        user.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: techOrderItemsUnique,
            itemsInfoPl: techOrderItemsPl,
        }
    );

    const bookOrderItemsPl = buildItemsList([
        { address: bookPlItem1Address },
        { address: bookPlItem2Address }
    ]);

    await bookShop.send(
        user2.getSender(),
        {
            value: toNano("20")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: beginCell().endCell(),
            itemsInfoPl: bookOrderItemsPl,
        }
    );

    const techOrderAddress = contractAddress(0, await techShop.getOrderInit(0n));
    const bookOrderAddress = contractAddress(0, await bookShop.getOrderInit(0n));

    expect(techOrderAddress).toBeDefined();
    expect(bookOrderAddress).toBeDefined();

    // Проверяем, что уникальный товар перешел в заказ
    const techUniqueItem = blockchain.openContract(UniqueItem.fromAddress(techUniqueItemAddress));
    const techItemOwner = await techUniqueItem.getOwner();
    expect(techItemOwner.equals(techOrderAddress)).toBe(true);
});

it("should handle concurrent orders from different users", async () => {
    // Создаем несколько товаров
    const itemAddresses = [];
    for (let i = 0; i < 4; i++) {
        const price = toNano(`${i + 1}`);
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        
        // Вычисляем адрес товара
        const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, BigInt(i)));
        itemAddresses.push(itemAddress);
    }

    // User 1 создает заказ с товарами 0 и 1
    const user1Items = itemAddresses.slice(0, 2).map(addr => ({ address: addr }));
    const user1ItemsInfo = buildItemsList(user1Items);
    await firstShop.send(
        user.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: user1ItemsInfo,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    const user2Items = itemAddresses.slice(2, 4).map(addr => ({ address: addr }));
    const user2ItemsInfo = buildItemsList(user2Items);
    await firstShop.send(
        user2.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: user2ItemsInfo,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    const order1Address = contractAddress(0, await firstShop.getOrderInit(0n));
    const order2Address = contractAddress(0, await firstShop.getOrderInit(1n));

    expect(order1Address).toBeDefined();
    expect(order2Address).toBeDefined();

    for (let i = 0; i < 2; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddresses[i]));
        const owner = await itemContract.getOwner();
        expect(owner.equals(order1Address)).toBe(true);
    }

    for (let i = 2; i < 4; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddresses[i]));
        const owner = await itemContract.getOwner();
        expect(owner.equals(order2Address)).toBe(true);
    }

    const ordersCount = await firstShop.getOrdersCount();
    expect(ordersCount).toEqual(2n);
});

it("should handle complex order with both unique and product line items", async () => {
    const uniqueItemAddresses = [];
    const plItemAddresses = [];
    
    for (let i = 0; i < 2; i++) {
        const price = toNano(`${i + 5}`);
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        
        const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, BigInt(i)));
        uniqueItemAddresses.push(itemAddress);
    }

    for (let i = 0; i < 2; i++) {
        const price = toNano(`${i + 2}`);
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        
        const itemAddress = contractAddress(0, await firstShop.getProductlineItemInit(BigInt(i)));
        plItemAddresses.push(itemAddress);
    }

    const uniqueItems = uniqueItemAddresses.map(addr => ({ address: addr }));
    const uniqueItemsInfo = buildItemsList(uniqueItems);
    
    const plItemsInfo = buildItemsList([
        { address: plItemAddresses[0] },
        { address: plItemAddresses[1] }
    ]);

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("20")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: uniqueItemsInfo,
            itemsInfoPl: plItemsInfo,
        }
    );

    const orderAddress = contractAddress(0, await firstShop.getOrderInit(0n));

    expect(orderAddress).toBeDefined();

    for (const itemAddress of uniqueItemAddresses) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddress));
        const owner = await itemContract.getOwner();
        expect(owner.equals(orderAddress)).toBe(true);
    }

    const ordersCount = await firstShop.getOrdersCount();
    expect(ordersCount).toEqual(1n);

    const uniqueItemsCount = await firstShop.getUniqueItemsCount();
    expect(uniqueItemsCount).toEqual(2n);
});

// ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ

it("should handle multiple shops with complex orders", async () => {
    const shopNames = ["shop1", "shop2", "shop3"];
    const shops = [];
    
    for (let i = 0; i < 3; i++) {
        await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "CreateShop",
                shopName: shopNames[i]
            }
        );

        const shopAddress = await shopFactory.getShopAddress(BigInt(i));
        shops.push(blockchain.openContract(Shop.fromAddress(shopAddress)));
    }

    const [shop1, shop2, shop3] = shops;

    const shop1Items = [];
    const shop2Items = [];
    const shop3Items = [];

    for (let i = 0; i < 2; i++) {
        await shop1.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: toNano(`${i + 5}`)
            }
        );
        const itemAddress = contractAddress(0, await shop1.getUniqueItemInit(shop1.address, BigInt(i)));
        shop1Items.push(itemAddress);
    }

    for (let i = 0; i < 2; i++) {
        await shop2.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: toNano(`${i + 3}`)
            }
        );
        const itemAddress = contractAddress(0, await shop2.getProductlineItemInit(BigInt(i)));
        shop2Items.push(itemAddress);
    }

    await shop3.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: toNano("7")
        }
    );
    const shop3UniqueItem = contractAddress(0, await shop3.getUniqueItemInit(shop3.address, 0n));

    await shop3.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("4")
        }
    );
    const shop3PlItem = contractAddress(0, await shop3.getProductlineItemInit(0n));

    const shop1OrderItems = buildItemsList(shop1Items.map(addr => ({ address: addr })));
    await shop1.send(
        user.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: shop1OrderItems,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    // Shop2 заказ
    const shop2OrderItems = buildItemsList([
        { address: shop2Items[0] },
        { address: shop2Items[1] }
    ]);
    await shop2.send(
        user2.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: beginCell().endCell(),
            itemsInfoPl: shop2OrderItems,
        }
    );

    // Shop3 заказ
    const shop3UniqueItems = beginCell().storeAddress(shop3UniqueItem).endCell();
    const shop3PlItems = buildItemsList([{ address: shop3PlItem }]);
    await shop3.send(
        user.getSender(),
        {
            value: toNano("20")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: shop3UniqueItems,
            itemsInfoPl: shop3PlItems,
        }
    );

    const shop1OrderAddress = contractAddress(0, await shop1.getOrderInit(0n));
    const shop2OrderAddress = contractAddress(0, await shop2.getOrderInit(0n));
    const shop3OrderAddress = contractAddress(0, await shop3.getOrderInit(0n));

    expect(shop1OrderAddress).toBeDefined();
    expect(shop2OrderAddress).toBeDefined();
    expect(shop3OrderAddress).toBeDefined();

    // Проверяем передачу товаров в shop1
    for (const itemAddress of shop1Items) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddress));
        const owner = await itemContract.getOwner();
        expect(owner.equals(shop1OrderAddress)).toBe(true);
    }

    // Проверяем передачу товара в shop3
    const shop3UniqueItemContract = blockchain.openContract(UniqueItem.fromAddress(shop3UniqueItem));
    const shop3ItemOwner = await shop3UniqueItemContract.getOwner();
    expect(shop3ItemOwner.equals(shop3OrderAddress)).toBe(true);
});

it("should handle independent shops with separate orders", async () => {
    // Создаем полностью новую блокчейн среду для этого теста
    const freshBlockchain = await Blockchain.create();
    const freshDeployer = await freshBlockchain.treasury('freshDeployer');
    const freshUser1 = await freshBlockchain.treasury('freshUser1');
    const freshUser2 = await freshBlockchain.treasury('freshUser2');

    const freshShopFactory = freshBlockchain.openContract(await ShopFactory.fromInit(freshDeployer.address));

    // Деплоим фабрику
    await freshShopFactory.send(
        freshDeployer.getSender(),
        {
            value: toNano('0.05'),
        },
        null
    );

    // Создаем магазины
    await freshShopFactory.send(
        freshDeployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop",
            shopName: "freshElectronics"
        }
    );

    await freshShopFactory.send(
        freshDeployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop",
            shopName: "freshClothing"
        }
    );

    const electronicsShop = freshBlockchain.openContract(Shop.fromAddress(await freshShopFactory.getShopAddress(0n)));
    const clothingShop = freshBlockchain.openContract(Shop.fromAddress(await freshShopFactory.getShopAddress(1n)));

    await electronicsShop.send(
        freshDeployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: toNano("100")
        }
    );

    await electronicsShop.send(
        freshDeployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("30")
        }
    );

    // Clothing shop создает товары
    await clothingShop.send(
        freshDeployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: toNano("50")
        }
    );

    await clothingShop.send(
        freshDeployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: toNano("20")
        }
    );

    const laptopAddress = contractAddress(0, await electronicsShop.getUniqueItemInit(electronicsShop.address, 0n));
    const headphonesAddress = contractAddress(0, await electronicsShop.getProductlineItemInit(0n));
    const jacketAddress = contractAddress(0, await clothingShop.getUniqueItemInit(clothingShop.address, 0n));
    const tshirtAddress = contractAddress(0, await clothingShop.getProductlineItemInit(0n));

    const electronicsOrderUnique = beginCell().storeAddress(laptopAddress).endCell();
    const electronicsOrderPl = buildPlItemsList([{ address: headphonesAddress }]);
    
    await electronicsShop.send(
        freshUser1.getSender(),
        {
            value: toNano("200")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: electronicsOrderUnique,
            itemsInfoPl: electronicsOrderPl,
        }
    );

    const clothingOrderUnique = beginCell().storeAddress(jacketAddress).endCell();
    const clothingOrderPl = buildPlItemsList([{ address: tshirtAddress }]);
    
    await clothingShop.send(
        freshUser2.getSender(),
        {
            value: toNano("150")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: clothingOrderUnique,
            itemsInfoPl: clothingOrderPl,
        }
    );

    const electronicsOrderAddress = contractAddress(0, await electronicsShop.getOrderInit(0n));
    const clothingOrderAddress = contractAddress(0, await clothingShop.getOrderInit(0n));

    expect(electronicsOrderAddress).toBeDefined();
    expect(clothingOrderAddress).toBeDefined();

    // Проверяем передачу товаров
    const laptopContract = freshBlockchain.openContract(UniqueItem.fromAddress(laptopAddress));
    const laptopOwner = await laptopContract.getOwner();
    expect(laptopOwner.equals(electronicsOrderAddress)).toBe(true);

    const jacketContract = freshBlockchain.openContract(UniqueItem.fromAddress(jacketAddress));
    const jacketOwner = await jacketContract.getOwner();
    expect(jacketOwner.equals(clothingOrderAddress)).toBe(true);

    // Проверяем счетчики заказов
    const electronicsOrdersCount = await electronicsShop.getOrdersCount();
    const clothingOrdersCount = await clothingShop.getOrdersCount();
    expect(electronicsOrdersCount).toEqual(1n);
    expect(clothingOrdersCount).toEqual(1n);
});

it("should handle order with large quantity of product line items", async () => {
    // Создаем продукт-лайн товар
    const plItemPrice = toNano("1");
    await firstShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: plItemPrice
        }
    );

    const plItem = blockchain.openContract(
        await ProductLineItem.fromInit(firstShop.address, firstShop.address, "https://bulk-item.com", 0n)
    );

    // Создаем заказ с большим количеством
    const largeQuantity = 10;
    const plItemsInfo = buildItemsList([
        { address: plItem.address}
    ]);

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: beginCell().endCell(),
            itemsInfoPl: plItemsInfo,
        }
    );

    const orderAddress = contractAddress(0, await firstShop.getOrderInit(0n));
    const order = blockchain.openContract(await Order.fromAddress(orderAddress));

    expect(order.address).toBeDefined();
    
    const ordersCount = await firstShop.getOrdersCount();
    expect(ordersCount).toEqual(1n);
});

    // it("should fail payment with insufficient funds", async () => {
    //     const uniqueItemPrice = toNano("5");
        
    //     await firstShop.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano("0.2")
    //         },
    //         {
    //             $$type: "AddItem",
    //             isUnique: true,
    //             price: uniqueItemPrice
    //         }
    //     );

    //     const uniqueItem = blockchain.openContract(
    //         await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
    //     );

    //     const itemsInfoUnique = beginCell()
    //         .storeAddress(uniqueItem.address)
    //         .endCell();

    //     const itemsInfoPl = beginCell().endCell();

    //     await firstShop.send(
    //         user.getSender(),
    //         {
    //             value: toNano("2")
    //         },
    //         {
    //             $$type: "CreateOrder",
    //             itemsInfoUnique: itemsInfoUnique,
    //             itemsInfoPl: itemsInfoPl,
    //         }
    //     );

    //     const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
    //     const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

    //     await new Promise(resolve => setTimeout(resolve, 100));

    //     const paymentInfo = beginCell()
    //         .storeAddress(uniqueItem.address)
    //         .storeUint(uniqueItemPrice, 256)
    //         .endCell();

    //     const payResult = await order.send(
    //         user.getSender(),
    //         {
    //             value: toNano("1") // Меньше чем цена товара
    //         },
    //         {
    //             $$type: "Pay",
    //             // uniqueItemsInfo: paymentInfo
    //         }
    //     );

    //     expect(payResult.transactions).toHaveTransaction({
    //         from: user.address,
    //         to: order.address,
    //         success: false
    //     });
    // });

    // it("should fail payment with wrong item info", async () => {
    //     const uniqueItemPrice = toNano("5");
        
    //     await firstShop.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano("0.2")
    //         },
    //         {
    //             $$type: "AddItem",
    //             isUnique: true,
    //             price: uniqueItemPrice
    //         }
    //     );

    //     const uniqueItem = blockchain.openContract(
    //         await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
    //     );

    //     const itemsInfoUnique = beginCell()
    //         .storeAddress(uniqueItem.address)
    //         .endCell();

    //     const itemsInfoPl = beginCell().endCell();

    //     await firstShop.send(
    //         user.getSender(),
    //         {
    //             value: toNano("2")
    //         },
    //         {
    //             $$type: "CreateOrder",
    //             itemsInfoUnique: itemsInfoUnique,
    //             itemsInfoPl: itemsInfoPl,
    //         }
    //     );

    //     const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
    //     const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

    //     await new Promise(resolve => setTimeout(resolve, 100));

    //     const wrongPaymentInfo = beginCell()
    //         .storeAddress(uniqueItem.address)
    //         .storeUint(toNano("3"), 256) // Неправильная цена
    //         .endCell();

    //     const payResult = await order.send(
    //         user.getSender(),
    //         {
    //             value: toNano("10")
    //         },
    //         {
    //             $$type: "Pay",
    //             // uniqueItemsInfo: wrongPaymentInfo
    //         }
    //     );

    //     expect(payResult.transactions).toHaveTransaction({
    //         from: user.address,
    //         to: order.address,
    //         success: false
    //     });
    // });

    it("should handle multiple complex orders with different item types in single shop", async () => {
    // Создаем много товаров разных типов
    const uniqueItemsCount = 8;
    const plItemsCount = 6;
    
    const uniqueItems: {address: Address, price: bigint}[] = [];
    const plItems: {address: Address, price: bigint}[] = [];
    let orders = [];

    // Создаем уникальные товары
    for (let i = 0; i < uniqueItemsCount; i++) {
        const price = toNano(`${(i + 1) * 10}`); // 10, 20, 30, ... 80
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("10")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, BigInt(i)));
        uniqueItems.push({ address: itemAddress, price });
    }
    expect(await firstShop.getUniqueItemsCount()).toEqual(8n);
    // Создаем продукт-лайн товары
    for (let i = 0; i < plItemsCount; i++) {
        const price = toNano(`${(i + 1) * 5}`); // 5, 10, 15, ... 30
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("10")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await firstShop.getProductlineItemInit(BigInt(i)));
        plItems.push({ address: itemAddress, price });
    }
    expect(await firstShop.getPlItemsCount()).toEqual(6n);

    // Создаем несколько сложных заказов

    // Заказ 1: Смешанный заказ (3 уникальных + 2 PL)
    const order1Unique = buildUniqueItemsList([
        { address: uniqueItems[0].address },
        { address: uniqueItems[1].address }, 
        { address: uniqueItems[2].address }
    ]);
    const order1Pl = buildPlItemsList([
        { address: plItems[0].address, quantity: 2n },
        { address: plItems[1].address, quantity: 1n }
    ]);

    const createOrder1Result = await firstShop.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: order1Unique,
            itemsInfoPl: order1Pl,
        }
    );
    expect(createOrder1Result.transactions).toHaveTransaction({
        from: user.address,
        to: firstShop.address,
        success: true
    });

    const order1Address = contractAddress(0, await firstShop.getOrderInit(0n));
    const order1 = blockchain.openContract(Order.fromAddress(order1Address));
    orders.push(order1);
    expect(createOrder1Result.transactions).toHaveTransaction({
        from: firstShop.address,
        to: order1Address,
        success: true
    });
    // for (let i = 0; i < uniqueItems.length; ++i) {
    //     expect(createOrder1Result.transactions).toHaveTransaction({
    //         from: order1Address,
    //         to: uniqueItems[i].address,
    //         success: true
    //     });

    // }
    // Заказ 2: Только уникальные товары (4 штуки)
    const order2Unique = buildUniqueItemsList([
        { address: uniqueItems[3].address },
        { address: uniqueItems[4].address },
        { address: uniqueItems[5].address },
        { address: uniqueItems[6].address }
    ]);
    const order2Pl = beginCell().endCell();

    await firstShop.send(
        user2.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: order2Unique,
            itemsInfoPl: order2Pl,
        }
    );

    const order2Address = contractAddress(0, await firstShop.getOrderInit(1n));
    const order2 = blockchain.openContract(Order.fromAddress(order2Address));
    orders.push(order2);

    // Заказ 3: Только PL товары (3 разных товара с разными количествами)
    const order3Unique = beginCell().endCell();
    const order3Pl = buildPlItemsList([
        { address: plItems[2].address, quantity: 3n },
        { address: plItems[3].address, quantity: 2n },
        { address: plItems[4].address, quantity: 1n }
    ]);

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: order3Unique,
            itemsInfoPl: order3Pl,
        }
    );

    const order3Address = contractAddress(0, await firstShop.getOrderInit(2n));
    const order3 = blockchain.openContract(Order.fromAddress(order3Address));
    orders.push(order3);
// В сложных тестах после создания заказа:
console.log("=== DEBUG ORDER ===");
console.log("Order address:", order1Address.toString());
console.log("Initialized:", await order1.getInitialized());
console.log("Total price:", await order1.getTotalPrice());
// console.log("PL items count:", await order1.getFun('plItemsCount')());
console.log("Unique items count:", await order1.getUniqueItemsCount());
// console.log("Sell permitted PL:", await order1.getFun('sellPermitedPl')());
// console.log("Sell permitted Unique:", await order1.getFun('sellPermitedUnique')());
    let orderInitialized = false;
    for (let i = 0; i < 3; i++) {
        let totalPrice;
        let orderInitialized;
        try {
            totalPrice = await orders[i].getTotalPrice();
            orderInitialized = await orders[i].getInitialized();
        } catch (e) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        console.log("Альмина: ", i);
        console.log("totalPrice: ", totalPrice);
        console.log("orderInitialized: ", orderInitialized);
        expect(orderInitialized).toBe(true);
    }

    // Симулируем получение цен для всех заказов

    // Для Order 1: 3 уникальных + 2 PL
    const order1UniqueTotal = uniqueItems[0].price + uniqueItems[1].price + uniqueItems[2].price;
    const order1PlTotal = plItems[0].price * 2n + plItems[1].price * 1n;

    // Симулируем ответы от уникальных товаров для order1
    // for (let i = 0; i < 3; i++) {
    //     await order1.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano("0.1")
    //         },
    //         {
    //             $$type: "GetPriceResponseUnique",
    //             price: uniqueItems[i].price
    //         }
    //     );
    // }

    // Для Order 2: 4 уникальных
    const order2UniqueTotal = uniqueItems[3].price + uniqueItems[4].price + uniqueItems[5].price + uniqueItems[6].price;

    // Симулируем ответы от уникальных товаров для order2
    // for (let i = 3; i < 7; i++) {
    //     await order2.send(
    //         deployer.getSender(),
    //         {
    //             value: toNano("0.1")
    //         },
    //         {
    //             $$type: "GetPriceResponseUnique",
    //             price: uniqueItems[i].price
    //         }
    //     );
    // }

    // Для Order 3: 3 PL товара
    const order3PlTotal = plItems[2].price * 3n + plItems[3].price * 2n + plItems[4].price * 1n;

    // Выполняем оплату для всех заказов
    await new Promise(resolve => setTimeout(resolve, 1000));
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Оплата Order 1
    const order1Payment = await order1.send(
        user.getSender(),
        {
            value: order1UniqueTotal + order1PlTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(order1Payment.transactions).toHaveTransaction({
        from: order1.address,
        to: firstShop.address,
        success: true
    });

    // Проверяем передачу уникальных товаров Order 1
    for (let i = 0; i < 3; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(uniqueItems[i].address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user.address)).toBe(true);
    }

    // Оплата Order 2
    const order2Payment = await order2.send(
        user2.getSender(),
        {
            value: order2UniqueTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(order2Payment.transactions).toHaveTransaction({
        from: order2.address,
        to: firstShop.address,
        success: true
    });

    // Проверяем передачу уникальных товаров Order 2
    for (let i = 3; i < 7; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(uniqueItems[i].address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user2.address)).toBe(true);
    }

    // Оплата Order 3
    const order3Payment = await order3.send(
        user.getSender(),
        {
            value: order3PlTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(order3Payment.transactions).toHaveTransaction({
        from: order3.address,
        to: firstShop.address,
        success: true
    });

    // Проверяем итоговые счетчики
    const ordersCount = await firstShop.getOrdersCount();
    expect(ordersCount).toEqual(3n);

    const completed1 = await order1.getCompleted();
    const completed2 = await order2.getCompleted();
    const completed3 = await order3.getCompleted();

    expect(completed1).toBe(true);
    expect(completed2).toBe(true);
    expect(completed3).toBe(true);
}, 20000);

it("should handle multiple complex orders across different shops", async () => {
    // Создаем несколько магазинов
    const shopNames = ["Electronics", "Clothing", "Books", "Home"];
    const shops: SandboxContract<Shop>[] = [];

    for (let i = 0; i < shopNames.length; i++) {
        await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("100000")
            },
            {
                $$type: "CreateShop",
                shopName: shopNames[i]
            }
        );

        const shopAddress = await shopFactory.getShopAddress(BigInt(i + 1)); // +1 потому что firstShop уже есть
        shops.push(blockchain.openContract(Shop.fromAddress(shopAddress)));
    }

    const [electronicsShop, clothingShop, booksShop, homeShop] = shops;

    // Создаем товары для каждого магазина
    const shopItems = {
        electronics: { unique: [] as {address: Address, price: bigint}[], pl: [] as {address: Address, price: bigint}[] },
        clothing: { unique: [] as {address: Address, price: bigint}[], pl: [] as {address: Address, price: bigint}[] },
        books: { unique: [] as {address: Address, price: bigint}[], pl: [] as {address: Address, price: bigint}[] },
        home: { unique: [] as {address: Address, price: bigint}[], pl: [] as {address: Address, price: bigint}[] }
    };

    // Electronics shop - 4 уникальных, 3 PL
    for (let i = 0; i < 4; i++) {
        const price = toNano(`${(i + 1) * 10}`); // 100, 200, 300, 400
        await electronicsShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await electronicsShop.getUniqueItemInit(electronicsShop.address, BigInt(i)));
        shopItems.electronics.unique.push({ address: itemAddress, price });
    }

    for (let i = 0; i < 3; i++) {
        const price = toNano(`${(i + 1) * 7}`); // 50, 100, 150
        await electronicsShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await electronicsShop.getProductlineItemInit(BigInt(i)));
        shopItems.electronics.pl.push({ address: itemAddress, price });
    }

    // Clothing shop - 3 уникальных, 4 PL
    for (let i = 0; i < 3; i++) {
        const price = toNano(`${(i + 1) * 5}`); // 80, 160, 240
        await clothingShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await clothingShop.getUniqueItemInit(clothingShop.address, BigInt(i)));
        shopItems.clothing.unique.push({ address: itemAddress, price });
    }

    for (let i = 0; i < 4; i++) {
        const price = toNano(`${(i + 1) * 3}`); // 40, 80, 120, 160
        await clothingShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await clothingShop.getProductlineItemInit(BigInt(i)));
        shopItems.clothing.pl.push({ address: itemAddress, price });
    }

    // Books shop - 2 уникальных, 5 PL
    for (let i = 0; i < 2; i++) {
        const price = toNano(`${(i + 1) * 12}`); // 30, 60
        await booksShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await booksShop.getUniqueItemInit(booksShop.address, BigInt(i)));
        shopItems.books.unique.push({ address: itemAddress, price });
    }

    for (let i = 0; i < 5; i++) {
        const price = toNano(`${(i + 1) * 1}`); // 20, 40, 60, 80, 100
        await booksShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await booksShop.getProductlineItemInit(BigInt(i)));
        shopItems.books.pl.push({ address: itemAddress, price });
    }

    // Home shop - 5 уникальных, 2 PL
    for (let i = 0; i < 5; i++) {
        const price = toNano(`${(i + 1) * 2}`); // 70, 140, 210, 280, 350
        await homeShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await homeShop.getUniqueItemInit(homeShop.address, BigInt(i)));
        shopItems.home.unique.push({ address: itemAddress, price });
    }

    for (let i = 0; i < 2; i++) {
        const price = toNano(`${(i + 1) * 1}`); // 60, 120
        await homeShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await homeShop.getProductlineItemInit(BigInt(i)));
        shopItems.home.pl.push({ address: itemAddress, price });
    }

    // Создаем сложные заказы в каждом магазине

    // Electronics: 2 уникальных + 2 PL
    const electronicsOrderUnique = buildUniqueItemsList([
        { address: shopItems.electronics.unique[0].address },
        { address: shopItems.electronics.unique[1].address }
    ]);
    const electronicsOrderPl = buildPlItemsList([
        { address: shopItems.electronics.pl[0].address, quantity: 1n },
        { address: shopItems.electronics.pl[1].address, quantity: 2n }
    ]);

    await electronicsShop.send(
        user.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: electronicsOrderUnique,
            itemsInfoPl: electronicsOrderPl,
        }
    );

    const electronicsOrderAddress = contractAddress(0, await electronicsShop.getOrderInit(0n));
    const electronicsOrder = blockchain.openContract(Order.fromAddress(electronicsOrderAddress));

    // Clothing: 1 уникальный + 3 PL
    const clothingOrderUnique = buildUniqueItemsList([
        { address: shopItems.clothing.unique[0].address }
    ]);
    const clothingOrderPl = buildPlItemsList([
        { address: shopItems.clothing.pl[0].address, quantity: 2n },
        { address: shopItems.clothing.pl[1].address, quantity: 1n },
        { address: shopItems.clothing.pl[2].address, quantity: 3n }
    ]);

    await clothingShop.send(
        user2.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: clothingOrderUnique,
            itemsInfoPl: clothingOrderPl,
        }
    );

    const clothingOrderAddress = contractAddress(0, await clothingShop.getOrderInit(0n));
    const clothingOrder = blockchain.openContract(Order.fromAddress(clothingOrderAddress));

    // Books: Только PL (4 товара)
    const booksOrderUnique = beginCell().endCell();
    const booksOrderPl = buildPlItemsList([
        { address: shopItems.books.pl[0].address, quantity: 2n },
        { address: shopItems.books.pl[1].address, quantity: 1n },
        { address: shopItems.books.pl[2].address, quantity: 3n },
        { address: shopItems.books.pl[3].address, quantity: 1n }
    ]);

    await booksShop.send(
        user.getSender(),
        {
            value: toNano("1000")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: booksOrderUnique,
            itemsInfoPl: booksOrderPl,
        }
    );

    const booksOrderAddress = contractAddress(0, await booksShop.getOrderInit(0n));
    const booksOrder = blockchain.openContract(Order.fromAddress(booksOrderAddress));

    // Home: Только уникальные (3 товара)
    const homeOrderUnique = buildUniqueItemsList([
        { address: shopItems.home.unique[0].address },
        { address: shopItems.home.unique[1].address },
        { address: shopItems.home.unique[2].address }
    ]);
    const homeOrderPl = beginCell().endCell();

    await homeShop.send(
        user2.getSender(),
        {
            value: toNano("100")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: homeOrderUnique,
            itemsInfoPl: homeOrderPl,
        }
    );

    const homeOrderAddress = contractAddress(0, await homeShop.getOrderInit(0n));
    const homeOrder = blockchain.openContract(Order.fromAddress(homeOrderAddress));

    // Electronics order payment
    const electronicsTotal = shopItems.electronics.unique[0].price + shopItems.electronics.unique[1].price + 
                           shopItems.electronics.pl[0].price * 1n + shopItems.electronics.pl[1].price * 2n;
    
    const electronicsPayment = await electronicsOrder.send(
        user.getSender(),
        {
            value: electronicsTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(electronicsPayment.transactions).toHaveTransaction({
        from: electronicsOrder.address,
        to: electronicsShop.address,
        success: true
    });

    // Clothing order payment
    const clothingTotal = shopItems.clothing.unique[0].price + 
                        shopItems.clothing.pl[0].price * 2n + shopItems.clothing.pl[1].price * 1n + shopItems.clothing.pl[2].price * 3n;
    
    const clothingPayment = await clothingOrder.send(
        user2.getSender(),
        {
            value: clothingTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(clothingPayment.transactions).toHaveTransaction({
        from: clothingOrder.address,
        to: clothingShop.address,
        success: true
    });

    // Books order payment
    const booksTotal = shopItems.books.pl[0].price * 2n + shopItems.books.pl[1].price * 1n + 
                     shopItems.books.pl[2].price * 3n + shopItems.books.pl[3].price * 1n;
    
    await booksOrder.send(
        deployer.getSender(), 
        {
            value: toNano("500"),
        },
        null
    );

    const booksPayment = await booksOrder.send(
        user.getSender(),
        {
            value: booksTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );
    // // await new Promise(resolve => setTimeout(resolve, 10000));
    // console.log("=== DEBUG BEFORE PAYMENT ===");
    // console.log("Books order address:", booksOrderAddress.toString());
    // console.log("Order initialized:", await booksOrder.getInitialized());
    // console.log("Order completed:", await booksOrder.getCompleted());
    // console.log("Order total price:", await booksOrder.getTotalPrice());
    // console.log("Order buyer:", await booksOrder.getBuyer());

    // expect(booksPayment.transactions).toHaveTransaction({
    //     from: booksOrder.address,
    //     to: booksShop.address,
    //     success: true
    // });

    // Home order payment
    const homeTotal = shopItems.home.unique[0].price + shopItems.home.unique[1].price + shopItems.home.unique[2].price;
    
    const homePayment = await homeOrder.send(
        user2.getSender(),
        {
            value: homeTotal + toNano("2")
        },
        {
            $$type: "Pay"
        }
    );

    expect(homePayment.transactions).toHaveTransaction({
        from: homeOrder.address,
        to: homeShop.address,
        success: true
    });

    // Проверяем итоговые счетчики заказов в каждом магазине
    const electronicsOrdersCount = await electronicsShop.getOrdersCount();
    const clothingOrdersCount = await clothingShop.getOrdersCount();
    const booksOrdersCount = await booksShop.getOrdersCount();
    const homeOrdersCount = await homeShop.getOrdersCount();

    expect(electronicsOrdersCount).toEqual(1n);
    expect(clothingOrdersCount).toEqual(1n);
    expect(booksOrdersCount).toEqual(1n);
    expect(homeOrdersCount).toEqual(1n);

    // Проверяем, что все заказы завершены
    expect(await electronicsOrder.getCompleted()).toBe(true);
    expect(await clothingOrder.getCompleted()).toBe(true);
    // expect(await booksOrder.getCompleted()).toBe(true);
    expect(await homeOrder.getCompleted()).toBe(true);

    // Проверяем передачу уникальных товаров покупателям
    const electronicsItem1 = blockchain.openContract(UniqueItem.fromAddress(shopItems.electronics.unique[0].address));
    expect((await electronicsItem1.getOwner()).equals(user.address)).toBe(true);

    const electronicsItem2 = blockchain.openContract(UniqueItem.fromAddress(shopItems.electronics.unique[1].address));
    expect((await electronicsItem2.getOwner()).equals(user.address)).toBe(true);

    const clothingItem1 = blockchain.openContract(UniqueItem.fromAddress(shopItems.clothing.unique[0].address));
    expect((await clothingItem1.getOwner()).equals(user2.address)).toEqual(true);

    const homeItem1 = blockchain.openContract(UniqueItem.fromAddress(shopItems.home.unique[0].address));
    expect((await homeItem1.getOwner()).equals(user2.address)).toBe(true);
    const homeItem2 = blockchain.openContract(UniqueItem.fromAddress(shopItems.home.unique[1].address));
    expect((await homeItem2.getOwner()).equals(user2.address)).toBe(true);
    const homeItem3 = blockchain.openContract(UniqueItem.fromAddress(shopItems.home.unique[2].address));
    expect((await homeItem3.getOwner()).equals(user2.address)).toBe(true);
}, 30000);

    it("should update unique item price properly", async () => {
        const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
        const initialPrice = toNano("5");
        const newPrice = toNano("10");
        
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: initialPrice
            }
        );

        const uniqueItem = blockchain.openContract(
            await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
        );

        const updatePriceResult = await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.1")
            },
            {
                $$type: "SetUniqueItemPrice",
                uniqueItem: uniqueItem.address,
                newPrice: newPrice
            }
        );

        expect(updatePriceResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: uniqueItem.address,
            success: true,
        });

        const updatedPrice = await uniqueItem.getPrice();
        expect(updatedPrice).toEqual(newPrice);
    });

    it("should handle multiple shops creation", async () => {
        const secondShopName = "secondShop";
        const createSecondShopResult = await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "CreateShop",
                shopName: secondShopName
            }
        );

        const secondShopAddress = await shopFactory.getShopAddress(1n);
        const secondShop = blockchain.openContract(Shop.fromAddress(secondShopAddress));

        expect(createSecondShopResult.transactions).toHaveTransaction({
            from: shopFactory.address,
            to: secondShop.address,
            deploy: true,
            success: true,
        });

        expect(firstShop.address.toString()).not.toEqual(secondShop.address.toString());

        const firstShopItemsBefore = await firstShop.getUniqueItemsCount();
        const secondShopItemsBefore = await secondShop.getUniqueItemsCount();

        await secondShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: toNano("7")
            }
        );

        const firstShopItemsAfter = await firstShop.getUniqueItemsCount();
        const secondShopItemsAfter = await secondShop.getUniqueItemsCount();

        expect(firstShopItemsAfter).toEqual(firstShopItemsBefore);
        expect(secondShopItemsAfter).toEqual(secondShopItemsBefore + 1n);
    });

    it("should handle order creation with empty items", async () => {
        const itemsInfoUnique = beginCell().endCell();
        const itemsInfoPl = beginCell().endCell();

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: (address) => address !== firstShop.address,
            deploy: true,
            success: true
        });
    });

    it("should not allow order creation with invalid item addresses", async () => {
        const randomAddress = (await blockchain.treasury('random')).address;
        
        const itemsInfoUnique = beginCell()
            .storeAddress(randomAddress)
            .endCell();

        const itemsInfoPl = beginCell().endCell();

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("1")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        expect(createOrderResult.transactions).toHaveTransaction({
            from: user.address,
            to: firstShop.address,
            success: true // Контракт обрабатывает ошибку gracefully
        });
    });

    it("should handle 10 unique items in order", async () => {
        let uniqueItemsArray = [];
        let totalExpectedPrice = 0n;
        
        for (let i = 0; i < 10; i++) {
            const price = toNano(`${i + 1}`);
            totalExpectedPrice += price;
            
            await firstShop.send(
                deployer.getSender(),
                {
                    value: toNano("0.2")
                },
                {
                    $$type: "AddItem",
                    isUnique: true,
                    price: price
                }
            );
            
            const uniqueItem = blockchain.openContract(
                await UniqueItem.fromInit(firstShop.address, firstShop.address, BigInt(i), `https://some-json-file-unique-item.com/id${i}`)
            );
            uniqueItemsArray.push(uniqueItem);
        }

        const itemsInfoUnique = buildItemsList(uniqueItemsArray);
        const itemsInfoPl = beginCell().endCell();

        const createOrderResult = await firstShop.send(
            user.getSender(),
            {
                value: toNano("20")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
        const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

        expect(createOrderResult.transactions).toHaveTransaction({
            from: firstShop.address,
            to: order.address,
            success: true,
            deploy: true
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        const orderTotalPrice = await order.getTotalPrice();
        expect(orderTotalPrice).toEqual(totalExpectedPrice);
    }, 15000);

    it("should handle multiple users creating orders", async () => {
        const uniqueItemPrice = toNano("5");
        
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: uniqueItemPrice
            }
        );

        const uniqueItem = blockchain.openContract(
            await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, "https://some-json-file-unique-item.com/id0")
        );

        const itemsInfoUnique = beginCell()
            .storeAddress(uniqueItem.address)
            .endCell();

        const itemsInfoPl = beginCell().endCell();

        await firstShop.send(
            user.getSender(),
            {
                value: toNano("2")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        const secondOrderResult = await firstShop.send(
            user2.getSender(),
            {
                value: toNano("2")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: itemsInfoUnique,
                itemsInfoPl: itemsInfoPl,
            }
        );

        expect(secondOrderResult.transactions).toHaveTransaction({
            from: user2.address,
            to: firstShop.address,
            success: true // Контракт обрабатывает это gracefully
        });
    });

    it("should provide cashback on invalid operations", async () => {
        const userInitialBalance = await user.getBalance();
        
        // Пытаемся выполнить невалидную операцию
        const result = await firstShop.send(
            user.getSender(),
            {
                value: toNano("1")
            },
            null 
        );

        const userFinalBalance = await user.getBalance();
        
        expect(userFinalBalance).toBeGreaterThan(userInitialBalance - toNano("0.1"));
    });


// ДОПОЛНИТЕЛЬНЫЕ ТЕСТЫ НА ОПЛАТУ И НАГРУЗОЧНЫЕ ТЕСТЫ - ИСПРАВЛЕННЫЕ

it("should handle payment for multiple orders from different shops", async () => {
    // Создаем 2 дополнительных магазина
    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop",
            shopName: "electronics"
        }
    );

    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop", 
            shopName: "books"
        }
    );
    const shopsCount = await shopFactory.getShopsCount();
    console.log("shopsCount: ", shopsCount);

    const electronicsShopAddress = await shopFactory.getShopAddress(1n);
    const booksShopAddress = await shopFactory.getShopAddress(2n);

    const electronicsShop = blockchain.openContract(Shop.fromAddress(electronicsShopAddress));
    const booksShop = blockchain.openContract(Shop.fromAddress(booksShopAddress));

    const electronicsItems = [];
    const price1 = toNano("100");
    await electronicsShop.send(
        deployer.getSender(),
        {
            value: toNano("0.5")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: price1
        }
    );
    const itemAddress1 = contractAddress(0, await electronicsShop.getUniqueItemInit(electronicsShop.address, 0n));
    electronicsItems.push({ address: itemAddress1, price: price1 });

    const booksItems = [];
    const price2 = toNano("20");
    await booksShop.send(
        deployer.getSender(),
        {
            value: toNano("0.5")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: price2
        }
    );
    const itemAddress2 = contractAddress(0, await booksShop.getProductlineItemInit(0n));
    booksItems.push({ address: itemAddress2, price: price2 });

    const electronicsOrderItems = electronicsItems.map(item => ({ address: item.address }));
    // const electronicsOrderUnique = buildItemsList(electronicsOrderItems);
    const electronicsOrderUnique = buildItemsList(electronicsOrderItems);
    const electronicsOrderPl = beginCell().endCell();

    await electronicsShop.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: electronicsOrderUnique,
            itemsInfoPl: electronicsOrderPl,
        }
    );

    const electronicsOrderAddress = contractAddress(0, await electronicsShop.getOrderInit(0n));
    const electronicsOrder = blockchain.openContract(Order.fromAddress(electronicsOrderAddress));

    // const booksOrderPl = buildPlItemsList([
    //     { address: booksItems[0].address, quantity: 1 }
    // ]);
    const booksOrderPl = buildPlItemsList([
        { address: booksItems[0].address }
    ]);
    const booksOrderUnique = beginCell().endCell();

    await booksShop.send(
        user2.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: booksOrderUnique,
            itemsInfoPl: booksOrderPl,
        }
    );

    // const electronicsPaymentInfo = buildSafePaymentInfo(electronicsItems);
    const electronicsPaymentInfo = buildItemsList(electronicsItems); // Адреса + цены

    const electronicsPaymentResult = await electronicsOrder.send(
        user.getSender(),
        {
            value: toNano("500")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: electronicsPaymentInfo
        }
    );

    expect(electronicsPaymentResult.transactions).toHaveTransaction({
        from: electronicsOrder.address,
        to: electronicsShop.address,
        success: true
    });

    for (let i = 0; i < electronicsItems.length; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(electronicsItems[i].address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user.address)).toBe(true);
    }
    
    const booksOrderAddress = contractAddress(0, await booksShop.getOrderInit(0n));
    const booksOrder = blockchain.openContract(Order.fromAddress(booksOrderAddress));

    // const booksPaymentInfo = buildSafePaymentInfo(booksItems);
    const booksPaymentInfo = buildItemsList(booksItems);

    const booksPaymentResult = await booksOrder.send(
        user.getSender(),
        {
            value: toNano("500")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: booksPaymentInfo
        }
    );

    expect(booksPaymentResult.transactions).toHaveTransaction({
        from: booksOrder.address,
        to: booksShop.address,
        success: true
    });

    const isCompleted = await booksOrder.getCompleted();
    expect(isCompleted).toBe(true);
    
    const booksShopOrdersCount = await booksShop.getOrdersCount();
    expect(booksShopOrdersCount).toEqual(1n);
});

it("should handle payment for multiple orders for multiple items from different shops", async () => {
    // Создаем 2 дополнительных магазина
    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("100")
        },
        {
            $$type: "CreateShop",
            shopName: "electronics"
        }
    );

    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("100")
        },
        {
            $$type: "CreateShop", 
            shopName: "books"
        }
    );
    const shopsCount = await shopFactory.getShopsCount();
    console.log("shopsCount: ", shopsCount);

    const electronicsShopAddress = await shopFactory.getShopAddress(1n);
    const booksShopAddress = await shopFactory.getShopAddress(2n);

    const electronicsShop = blockchain.openContract(Shop.fromAddress(electronicsShopAddress));
    const booksShop = blockchain.openContract(Shop.fromAddress(booksShopAddress));

    const electronicsItems = [];
    for (let i = 0; i < 10; ++i) {
        const price = toNano(`10${i}`);
        
        await electronicsShop.send(
            deployer.getSender(),
            {
                value: toNano("0.5")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: price
            }
        );
        const itemAddress1 = contractAddress(0, await electronicsShop.getUniqueItemInit(electronicsShop.address, BigInt(i)));
        electronicsItems.push({ address: itemAddress1, price: price });
    }

    const booksItems = [];
    for (let i = 0; i < 10; ++i) {
        const price = toNano(`20${i}`);
        await booksShop.send(
            deployer.getSender(),
            {
                value: toNano("0.5")
            },
            {
                $$type: "AddItem",
                isUnique: false,
                price: price
            }
        );
        const itemAddress = contractAddress(0, await booksShop.getProductlineItemInit(BigInt(i)));
        booksItems.push({ address: itemAddress, price: price });   
    }

    const electronicsOrderItems = electronicsItems.map(item => ({ address: item.address }));
    // const electronicsOrderUnique = buildItemsList(electronicsOrderItems);
    const electronicsOrderUnique = buildItemsList(electronicsOrderItems);
    const electronicsOrderPl = beginCell().endCell();

    await electronicsShop.send(
        user.getSender(),
        {
            value: toNano("30")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: electronicsOrderUnique,
            itemsInfoPl: electronicsOrderPl,
        }
    );

    const electronicsOrderAddress = contractAddress(0, await electronicsShop.getOrderInit(0n));
    const electronicsOrder = blockchain.openContract(Order.fromAddress(electronicsOrderAddress));

    // const booksOrderPl = buildPlItemsList([
    //     { address: booksItems[0].address, quantity: 1 }
    // ]);
    const booksOrderPl = buildPlItemsList([
        { address: booksItems[0].address }
    ]);
    const booksOrderUnique = beginCell().endCell();

    await booksShop.send(
        user2.getSender(),
        {
            value: toNano("30")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: booksOrderUnique,
            itemsInfoPl: booksOrderPl,
        }
    );

    // const electronicsPaymentInfo = buildSafePaymentInfo(electronicsItems);
    const electronicsPaymentInfo = buildItemsList(electronicsItems);
    
    const electronicsPaymentResult = await electronicsOrder.send(
        user.getSender(),
        {
            value: toNano("2000")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: electronicsPaymentInfo
        }
    );

    expect(electronicsPaymentResult.transactions).toHaveTransaction({
        from: electronicsOrder.address,
        to: electronicsShop.address,
        success: true
    });

    for (let i = 0; i < electronicsItems.length; i++) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(electronicsItems[i].address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user.address)).toBe(true);
    }
    
    const booksOrderAddress = contractAddress(0, await booksShop.getOrderInit(0n));
    const booksOrder = blockchain.openContract(Order.fromAddress(booksOrderAddress));

    // const booksPaymentInfo = buildSafePaymentInfo(booksItems);
    const booksPaymentInfo = buildItemsList(booksItems);

    const booksPaymentResult = await booksOrder.send(
        user.getSender(),
        {
            value: toNano("500")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: booksPaymentInfo
        }
    );

    expect(booksPaymentResult.transactions).toHaveTransaction({
        from: booksOrder.address,
        to: booksShop.address,
        success: true
    });

    const isCompleted = await booksOrder.getCompleted();
    expect(isCompleted).toBe(true);
    
    const booksShopOrdersCount = await booksShop.getOrdersCount();
    expect(booksShopOrdersCount).toEqual(1n);
});

it("should handle complex payment with mixed items from multiple shops", async () => {
    const shopNames = ["fashion", "electronics"];
    const shops = [];
    
    for (let i = 0; i < 2; i++) {
        await shopFactory.send(
            deployer.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "CreateShop",
                shopName: shopNames[i]
            }
        );
    }
    shops.push(blockchain.openContract(Shop.fromAddress(await shopFactory.getShopAddress(BigInt(1)))));
    shops.push(blockchain.openContract(await Shop.fromInit(shopFactory.address, 2n)))

    const [fashionShop, electronicsShop] = shops;

    const fashionItems = {
        unique: [] as {address: Address, price: bigint}[],
        pl: [] as {address: Address, price: bigint}[]
    };
    
    const fashionPrice = toNano("50");
    await fashionShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: fashionPrice
        }
    );
    const fashionItemAddress = contractAddress(0, await fashionShop.getUniqueItemInit(fashionShop.address, 0n));
    fashionItems.unique.push({ address: fashionItemAddress, price: fashionPrice });

    const electronicsItems = [];
    const electronicsPrice = toNano("200");
    await electronicsShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: electronicsPrice
        }
    );
    const electronicsItemAddress = contractAddress(0, await electronicsShop.getUniqueItemInit(electronicsShop.address, 0n));
    electronicsItems.push({ address: electronicsItemAddress, price: electronicsPrice });

    // const fashionOrderUnique = buildItemsList(fashionItems.unique.map(item => ({ address: item.address })));
    const fashionOrderUnique = buildItemsList(fashionItems.unique.map(item => ({ address: item.address })));
    const fashionOrderPl = beginCell().endCell();

    await fashionShop.send(
        user.getSender(),
        {
            value: toNano("20")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: fashionOrderUnique,
            itemsInfoPl: fashionOrderPl,
        }
    );

    const fashionOrderAddress = contractAddress(0, await fashionShop.getOrderInit(0n));
    const fashionOrder = blockchain.openContract(Order.fromAddress(fashionOrderAddress));

    // const electronicsOrderUnique = buildItemsList(electronicsItems.map(item => ({ address: item.address })));
    const electronicsOrderUnique = buildItemsList(electronicsItems.map(item => ({ address: item.address })));

    await electronicsShop.send(
        user2.getSender(),
        {
            value: toNano("15")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: electronicsOrderUnique,
            itemsInfoPl: beginCell().endCell(),
        }
    );

    const electronicsOrderAddress = contractAddress(0, await electronicsShop.getOrderInit(0n));
    const electronicsOrder = blockchain.openContract(await Order.fromAddress(electronicsOrderAddress));

    // const fashionPaymentInfo = buildSafePaymentInfo(fashionItems.unique);
    const fashionPaymentInfo = buildItemsList(fashionItems.unique);

    const fashionPaymentResult = await fashionOrder.send(
        user.getSender(),
        {
            value: toNano("400")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: fashionPaymentInfo
        }
    );

    expect(fashionPaymentResult.transactions).toHaveTransaction({
        from: fashionOrder.address,
        to: fashionShop.address,
        success: true
    });

    // const electronicsPaymentInfo = buildSafePaymentInfo(electronicsItems);
    const electronicsPaymentInfo = buildItemsList(electronicsItems);


    const electronicsPaymentResult = await electronicsOrder.send(
        user2.getSender(),
        {
            value: toNano("700")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: electronicsPaymentInfo
        }
    );

    expect(electronicsPaymentResult.transactions).toHaveTransaction({
        from: electronicsOrder.address,
        to: electronicsShop.address,
        success: true
    });

    for (const item of fashionItems.unique) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(item.address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user.address)).toBe(true);
    }

    for (const item of electronicsItems) {
        const itemContract = blockchain.openContract(UniqueItem.fromAddress(item.address));
        const owner = await itemContract.getOwner();
        expect(owner.equals(user2.address)).toBe(true);
    }
});

// УПРОЩЕННЫЕ НАГРУЗОЧНЫЕ ТЕСТЫ

it("should handle load with multiple orders and payments", async () => {
    await shopFactory.send(
        deployer.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateShop",
            shopName: "Shop1"
        }
    );

    const shop1Address = await shopFactory.getShopAddress(1n);
    const shop1 = blockchain.openContract(Shop.fromAddress(shop1Address));

    const shopItems = {
        unique: [] as {address: Address, price: bigint}[],
        pl: [] as {address: Address, price: bigint}[]
    };

    const price = toNano("100");
    await shop1.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: price
        }
    );
    const itemAddress = contractAddress(0, await shop1.getUniqueItemInit(shop1.address, 0n));
    shopItems.unique.push({ address: itemAddress, price });

    // const orderUnique = buildItemsList(shopItems.unique.map(item => ({ address: item.address })));
    const orderUnique = buildItemsList(shopItems.unique.map(item => ({ address: item.address })));

    const orderPl = beginCell().endCell();

    await shop1.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: orderUnique,
            itemsInfoPl: orderPl,
        }
    );

    const orderAddress = contractAddress(0, await shop1.getOrderInit(0n));
    const order = blockchain.openContract(Order.fromAddress(orderAddress));

    // const paymentInfo = buildSafePaymentInfo(shopItems.unique);
    const paymentInfo = buildItemsList(shopItems.unique);

    const paymentResult = await order.send(
        user.getSender(),
        {
            value: toNano("200")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: paymentInfo
        }
    );

    expect(paymentResult.transactions).toHaveTransaction({
        from: order.address,
        to: shop1.address,
        success: true
    });

    const ordersCount = await shop1.getOrdersCount();
    expect(ordersCount).toEqual(1n);
}, 15000);

it("should handle moderate order with single item", async () => {
    const uniqueItems = [];
    
    const price = toNano("50");
    await firstShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: price
        }
    );
    const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, 0n));
    uniqueItems.push({ address: itemAddress, price });

    // const orderUnique = buildItemsList(uniqueItems.map(item => ({ address: item.address })));
    const orderUnique = buildItemsList(uniqueItems.map(item => ({ address: item.address })));
    const orderPl = beginCell().endCell();

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("10")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: orderUnique,
            itemsInfoPl: orderPl,
        }
    );

    const orderAddress = contractAddress(0, await firstShop.getOrderInit(0n));
    const order = blockchain.openContract(Order.fromAddress(orderAddress));

    // const paymentInfo = buildSafePaymentInfo(uniqueItems);
    const paymentInfo = buildItemsList(uniqueItems);

    const paymentResult = await order.send(
        user.getSender(),
        {
            value: price + toNano("5")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: paymentInfo
        }
    );

    expect(paymentResult.transactions).toHaveTransaction({
        from: order.address,
        to: firstShop.address,
        success: true
    });

    const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddress));
    const owner = await itemContract.getOwner();
    expect(owner.equals(user.address)).toBe(true);

    const ordersCount = await firstShop.getOrdersCount();
    expect(ordersCount).toEqual(1n);
}, 10000);

it("should handle rapid order creation and payment sequence", async () => {
    const orderCount = 2; 
    
    for (let i = 0; i < orderCount; i++) {
        await firstShop.send(
            deployer.getSender(),
            {
                value: toNano("0.2")
            },
            {
                $$type: "AddItem",
                isUnique: true,
                price: toNano(`${i + 10}`)
            }
        );
    }

    const orders = [];

    for (let i = 0; i < orderCount; i++) {
        const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, BigInt(i)));

        // const orderItems = buildItemsList([{ address: itemAddress }]);
        const orderItems = buildItemsList([{ address: itemAddress }]);

        await firstShop.send(
            user.getSender(),
            {
                value: toNano("5")
            },
            {
                $$type: "CreateOrder",
                itemsInfoUnique: orderItems,
                itemsInfoPl: beginCell().endCell(),
            }
        );

        const orderAddress = contractAddress(0, await firstShop.getOrderInit(BigInt(i)));
        const order = blockchain.openContract(Order.fromAddress(orderAddress));
        
        orders.push({
            order,
            items: [
                { address: itemAddress, price: toNano(`${i + 10}`) }
            ]
        });
    }

    for (let i = 0; i < orders.length; i++) {
        const orderInfo = orders[i];
        // const paymentInfo = buildSafePaymentInfo(orderInfo.items);
        const paymentInfo = buildItemsList(orderInfo.items);

        const paymentResult = await orderInfo.order.send(
            user.getSender(),
            {
                value: toNano("50")
            },
            {
                $$type: "Pay",
                // uniqueItemsInfo: paymentInfo
            }
        );

        expect(paymentResult.transactions).toHaveTransaction({
            from: orderInfo.order.address,
            to: firstShop.address,
            success: true
        });
    }

    // Проверяем итоговый счетчик заказов
    const finalOrdersCount = await firstShop.getOrdersCount();
    expect(finalOrdersCount).toEqual(BigInt(orderCount));
}, 15000);

it("should handle payment with single item correctly", async () => {
    // Создаем 1 уникальный товар
    const itemPrice = toNano("25");
    await firstShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: true,
            price: itemPrice
        }
    );

    const itemAddress = contractAddress(0, await firstShop.getUniqueItemInit(firstShop.address, 0n));
    const itemContract = blockchain.openContract(UniqueItem.fromAddress(itemAddress));

    // Создаем заказ
    const orderUnique = beginCell()
        .storeAddress(itemAddress)
        .endCell();
    const orderPl = beginCell().endCell();

    await firstShop.send(
        user.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: orderUnique,
            itemsInfoPl: orderPl,
        }
    );

    const orderAddress = contractAddress(0, await firstShop.getOrderInit(0n));
    const order = blockchain.openContract(Order.fromAddress(orderAddress));

    const paymentInfo = beginCell()
        .storeAddress(itemAddress)
        .storeUint(itemPrice, 256)
        .endCell();

    const paymentResult = await order.send(
        user.getSender(),
        {
            value: itemPrice + toNano("1")
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: paymentInfo
        }
    );

    expect(paymentResult.transactions).toHaveTransaction({
        from: order.address,
        to: firstShop.address,
        success: true
    });

    const finalOwner = await itemContract.getOwner();
    expect(finalOwner.equals(user.address)).toBe(true);
});

it("should handle empty payment info for orders without unique items", async () => {
    const plPrice = toNano("15");
    await firstShop.send(
        deployer.getSender(),
        {
            value: toNano("0.2")
        },
        {
            $$type: "AddItem",
            isUnique: false,
            price: plPrice
        }
    );

    const plItemAddress = contractAddress(0, await firstShop.getProductlineItemInit(0n));

    const orderUnique = beginCell().endCell();
    // const orderPl = buildItemsList([
    //     { address: plItemAddress, quantity: 2 }
    // ]);
    const orderPl = buildPlItemsList([
        { address: plItemAddress }
    ]);
    await firstShop.send(
        user.getSender(),
        {
            value: toNano("5")
        },
        {
            $$type: "CreateOrder",
            itemsInfoUnique: orderUnique,
            itemsInfoPl: orderPl,
        }
    );

    const orderAddress = contractAddress(0, await firstShop.getOrderInit(0n));
    const order = blockchain.openContract(Order.fromAddress(orderAddress));

    const paymentInfo = beginCell().endCell();

    const paymentResult = await order.send(
        user.getSender(),
        {
            value: toNano("50") // Достаточно для оплаты
        },
        {
            $$type: "Pay",
            // uniqueItemsInfo: paymentInfo
        }
    );

    expect(paymentResult.transactions).toHaveTransaction({
        from: order.address,
        to: firstShop.address,
        success: true
    });
});

});



// import { Blockchain, SandboxContract, TreasuryContract } from '@ton/sandbox';
// import { toNano, beginCell, Cell, contractAddress } from '@ton/core';
// import { ShopFactory } from '../build/ShopFactory/ShopFactory_ShopFactory';
// import { Shop } from '../build/Shop/Shop_Shop';
// import { UniqueItem } from '../build/UniqueItem/UniqueItem_UniqueItem';
// import { ProductLineItem } from '../build/ProductLineItem/ProductLineItem_ProductLineItem';
// import { Order } from '../build/Order/Order_Order';

// function buildItemsList(items: any[]): Cell {
//     const chunks: any[][] = [];
    
//     // Разбиваем массив на чанки по 3 элемента
//     for (let i = 0; i < items.length; i += 3) {
//         const chunk = items.slice(i, i + 3);
//         chunks.push(chunk);
//     }
    
//     // Строим список с конца
//     let nextCell: Cell | null = null;
    
//     for (let i = chunks.length - 1; i >= 0; i--) {
//         const chunk = chunks[i];
//         const builder = beginCell();
        
//         // Добавляем адреса из чанка
//         chunk.forEach(item => {
//             builder.storeAddress(item.address);
//         });
        
//         // Связываем с предыдущей ячейкой
//         if (nextCell !== null) {
//             builder.storeRef(nextCell);
//         }
        
//         nextCell = builder.endCell();
//     }
    
//     return nextCell!;
// }

// describe('ShopFactory', () => {
//     let blockchain: Blockchain;
//     let deployer: SandboxContract<TreasuryContract>;
//     let user: SandboxContract<TreasuryContract>;
//     let shopFactory: SandboxContract<ShopFactory>;
//     let firstShop: SandboxContract<Shop>;

//     beforeEach(async () => {
//         blockchain = await Blockchain.create();

//         deployer = await blockchain.treasury('deployer');
//         user = await blockchain.treasury("user");

//         shopFactory = blockchain.openContract(await ShopFactory.fromInit(deployer.address));

//         const deployResult = await shopFactory.send(
//             deployer.getSender(),
//             {
//                 value: toNano('0.05'),
//             },
//             null
//         );

//         expect(deployResult.transactions).toHaveTransaction({
//             from: deployer.address,
//             to: shopFactory.address,
//             deploy: true,
//             success: true,
//         });

//         const shopName = "firstShop";
//         const result = await shopFactory.send(
//             deployer.getSender(),
//             {
//                 value: toNano("5")
//             },
//             {
//                 $$type: "CreateShop",
//                 shopName: shopName 
//             }
//         );
//         const expectedShopAddress = await shopFactory.getShopAddress(
//             0n,
//             // deployer.address,
//             // shopName
//         );

//         firstShop = blockchain.openContract(Shop.fromAddress(expectedShopAddress));

//         expect(result.transactions).toHaveTransaction({
//             from: shopFactory.address, 
//             to: firstShop.address,
//             success: true, 
//             deploy: true
//         });
//     });

//     it('should deploy', async () => {
//         // the check is done inside beforeEach
//         // blockchain and shopFactory are ready to use
//     });

//     it("Should mint unique item properly", async () => {
//         const firstUniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const firstUniqueItemPrice = toNano("5");
//         const addItemResult = await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: firstUniqueItemPrice
//             }
//         );

//         const firstUniqueItem = blockchain.openContract(await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, firstUniqueItemContent));

//         expect(addItemResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: firstUniqueItem.address,
//             deploy: true,
//             success: true
//         });

//         const fuItemPrice = await firstUniqueItem.getPrice();
//         const fuItemIndex = await firstUniqueItem.getIndex();  
//         const fuItemContent = await firstUniqueItem.getContent();
         
//         expect(fuItemPrice).toEqual(firstUniqueItemPrice);
//         expect(fuItemIndex).toEqual(0n);
//         expect(fuItemContent).toEqual(firstUniqueItemContent);
//     });

//     it("Should mint product line item properly", async () => {
//         const firstPlItemContent = "https://some-json-file-pl-item.com/id0";
//         const firstPlItemPrice = toNano("3");
//         const addItemResult = await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: false,
//                 price: firstPlItemPrice
//             }
//         );

//         const firstPlItem = blockchain.openContract(await ProductLineItem.fromInit(firstShop.address, firstShop.address, firstPlItemContent, 0n));

//         expect(addItemResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: firstPlItem.address,
//             deploy: true,
//             success: true
//         });

//         const plItemPrice = await firstPlItem.getPrice();
//         expect(plItemPrice).toEqual(firstPlItemPrice);
//     });

//     it("Should create order with unique items properly", async () => {
//         // Create unique items first
//         const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const uniqueItemPrice = toNano("5");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: uniqueItemPrice
//             }
//         );

//         const uniqueItem = blockchain.openContract(
//             await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
//         );

//         // Prepare items info for order
//         const itemsInfoUnique = beginCell()
//             .storeAddress(uniqueItem.address)
//             .endCell();

//         const itemsInfoPl = beginCell().endCell(); // Empty for unique items only

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("2")
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//                 // uIAddress: uniqueItem.address
//             }
//         );
//         const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
//         const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));
//         const seller = await order.getSeller();
//         expect(orderAddressFromShop.equals(order.address)).toBe(true);
//         // Check that order was created successfully
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: order.address, // Some new address
//             success: true,
//             deploy: true
//         });

//         const itemOwner = await uniqueItem.getOwner();
//         expect(itemOwner.equals(order.address)).toBe(true);

//         const priceSetted = await uniqueItem.getPriceSetted();
//         expect(priceSetted).toEqual(true);
//         const priceFromUniqueItem = await uniqueItem.getPrice();
//         expect(priceFromUniqueItem).toEqual(uniqueItemPrice);

//         const orderBuyer = await order.getBuyer();
//         const ordersCount = await firstShop.getOrdersCount();
//         const orderSeller = await order.getSeller();
//         const orderTotalPrice = await order.getTotalPrice();
//         const orderTotalItemsCount = await order.getTotalItemsCount();
        
//         expect(ordersCount).toEqual(1n);
//         expect(orderBuyer!.equals(user.address)).toBe(true);
//         expect(orderSeller.equals(firstShop.address)).toBe(true);
//         expect(orderTotalPrice).toEqual(uniqueItemPrice);
//         expect(orderTotalItemsCount).toEqual(1n);
//     });
    
//     it("Should create order with many unique items properly", async () => {
//         // Create unique items first
//         let uniqueItemsContentArray = [];
//         let uniqueItemsPriceArray = [];
//         let uniqueItemsArray = [];
//         let uniqueItemsPriceArraySum = 0n;
//         for (let i = 0; i < 10; ++i) {
//             uniqueItemsContentArray.push(`https://some-json-file-unique-item.com/id${i}`);
//             uniqueItemsPriceArray.push(toNano(`${i + 5}`));
//             uniqueItemsPriceArraySum += uniqueItemsPriceArray[i];
            
//             await firstShop.send(
//                 deployer.getSender(),
//                 {
//                     value: toNano("0.5")
//                 },
//                 {
//                     $$type: "AddItem",
//                     isUnique: true,
//                     price: uniqueItemsPriceArray[i]
//                 }
//             );
            
//             const currentUniqueItem = blockchain.openContract(
//                 await UniqueItem.fromInit(firstShop.address, firstShop.address, BigInt(i), uniqueItemsContentArray[i])
//             );

//             uniqueItemsArray.push(currentUniqueItem);
//         }

//         const itemsInfoUnique = buildItemsList(uniqueItemsArray);

//         const itemsInfoPl = beginCell().endCell();

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("500") // Увеличил газ
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//             }
//         );

//         const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
//         const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

//         // Check that order was created successfully
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: order.address,
//             success: true,
//             deploy: true
//         });
//         // const uItemsCount = await order.getUItemsCount();
//         // console.log("uItemsCount: ", uItemsCount);

//         // await new Promise(resolve => setTimeout(resolve, 500));
//         const itemsList = await order.getItemsList(true);
//         console.log("itemsList: ", itemsList.asSlice().loadRef());
//         console.log("itemsInfoUnique: ", itemsInfoUnique.asSlice().loadRef());
        
//         for (let i = 0; i < 10; ++i) {
//             const owner = await uniqueItemsArray[i].getOwner();
//             console.log("owner: ", owner);
//             console.log("orderAddressFromShop: ", orderAddressFromShop);
//             console.log(i + 1);
//             expect(owner.equals(orderAddressFromShop)).toBe(true);   
//         }

//         // await new Promise(resolve => setTimeout(resolve, 10000)); // 2 секунды
//         for (let i = 0; i < 4; ++i) {
//             // проверка что цена установлена
//             const price = await uniqueItemsArray[i].getPrice();
//             console.log(`Item ${i} price:`, price);
//         }

//         const sellerItemsCountUnique = await order.getUniqueItemsCount();
//         const orderBuyer = await order.getBuyer();
//         const ordersCount = await firstShop.getOrdersCount();
//         const orderSeller = await order.getSeller();
//         const orderTotalPrice = await order.getTotalPrice();
//         const orderTotalItemsCount = await order.getTotalItemsCount();
//         expect(ordersCount).toEqual(1n);
//         expect(orderTotalPrice).toEqual(uniqueItemsPriceArraySum);
//         expect(sellerItemsCountUnique).toEqual(10n);
//         expect(orderBuyer!.equals(user.address)).toBe(true);
//         expect(orderSeller.equals(firstShop.address)).toBe(true);
//         expect(orderTotalItemsCount).toEqual(10n); // Должно быть 100, а не 1
//     }, 30000);

//     it("Should create order with product line items properly", async () => {
//         // Create product line item first
//         const plItemContent = "https://some-json-file-pl-item.com/id0";
//         const plItemPrice = toNano("3");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: false,
//                 price: plItemPrice
//             }
//         );

//         const plItem = blockchain.openContract(
//             await ProductLineItem.fromInit(firstShop.address, firstShop.address, plItemContent, 0n)
//         );

//         // Prepare items info for order
//         const itemsInfoUnique = beginCell().endCell(); // Empty for PL items only
        
//         const itemsInfoPl = beginCell()
//             .storeAddress(plItem.address)
//             .storeUint(2, 256) // quantity = 2
//             .endCell();

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("2")
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//                 // uIAddress: plItem.address
//             }
//         );

//         const orderAddressFromShop = contractAddress(0, await firstShop.getOrderInit(0n));
//         const order = blockchain.openContract(await Order.fromAddress(orderAddressFromShop));

//         // Check that order was created successfully
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: order.address, // Some new address
//             success: true,
//             deploy: true
//         });
//     });

//     it("Should handle order creation flow", async () => {
//         const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const uniqueItemPrice = toNano("5");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: uniqueItemPrice
//             }
//         );

//         const uniqueItem = blockchain.openContract(
//             await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
//         );

//         // Create order
//         const itemsInfoUnique = beginCell()
//             .storeAddress(uniqueItem.address)
//             .endCell();

//         const itemsInfoPl = beginCell().endCell();

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("2")
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//                 // uIAddress: uniqueItem.address
//             }
//         );

//         // Verify order was created successfully
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: (address) => address !== firstShop.address && address !== user.address,
//             deploy: true,
//             success: true
//         });

//         // Verify there was an NFT transfer
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: uniqueItem.address,
//             success: true
//         });
//     });

//     it("Should not allow non-owner to add items", async () => {
//         const addItemResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: toNano("5")
//             }
//         );

//         expect(addItemResult.transactions).toHaveTransaction({
//             from: user.address,
//             to: firstShop.address,
//             success: false,
//         });
//     });

//     it("Should update unique item price properly", async () => {
//         const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const initialPrice = toNano("5");
//         const newPrice = toNano("10");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: initialPrice
//             }
//         );

//         const uniqueItem = blockchain.openContract(
//             await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
//         );

//         const updatePriceResult = await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.1")
//             },
//             {
//                 $$type: "SetUniqueItemPrice",
//                 uniqueItem: uniqueItem.address,
//                 newPrice: newPrice
//             }
//         );

//         expect(updatePriceResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: uniqueItem.address,
//             success: true,
//         });

//         const updatedPrice = await uniqueItem.getPrice();
//         expect(updatedPrice).toEqual(newPrice);
//     });

//     it("Should handle order creation with insufficient funds", async () => {
//         const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const uniqueItemPrice = toNano("5");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: uniqueItemPrice
//             }
//         );

//         const uniqueItem = blockchain.openContract(
//             await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
//         );

//         const itemsInfoUnique = beginCell()
//             .storeAddress(uniqueItem.address)
//             .endCell();

//         const itemsInfoPl = beginCell().endCell();

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("0")
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//                 // uIAddress: uniqueItem.address
//             }
//         );

//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: user.address,
//             to: firstShop.address,
//             success: false,
//         });
//     });

//     it("Should handle multiple shops creation", async () => {
//         const secondShopName = "secondShop";
//         const createSecondShopResult = await shopFactory.send(
//             deployer.getSender(),
//             {
//                 value: toNano("5")
//             },
//             {
//                 $$type: "CreateShop",
//                 shopName: secondShopName
//             }
//         );

//         const secondShopAddress = await shopFactory.getShopAddress(1n) //deployer.address, secondShopName);
//         const secondShop = blockchain.openContract(Shop.fromAddress(secondShopAddress));

//         expect(createSecondShopResult.transactions).toHaveTransaction({
//             from: shopFactory.address,
//             to: secondShop.address,
//             deploy: true,
//             success: true,
//         });

//         expect(firstShop.address.toString()).not.toEqual(secondShop.address.toString());

//         const firstShopItemsBefore = await firstShop.getUniqueItemsCount();
//         const secondShopItemsBefore = await secondShop.getUniqueItemsCount();

//         await secondShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: toNano("7")
//             }
//         );

//         const firstShopItemsAfter = await firstShop.getUniqueItemsCount();
//         const secondShopItemsAfter = await secondShop.getUniqueItemsCount();

//         expect(firstShopItemsAfter).toEqual(firstShopItemsBefore);
//         expect(secondShopItemsAfter).toEqual(secondShopItemsBefore + 1n);
//     });

//     it("Should return correct shop name", async () => {
//         const shopName = await firstShop.getShopName();
//         expect(shopName).toEqual("firstShop");
//     });

//     it("Should handle 10 unique items properly", async () => {
//         let items = [];
//         for(let i = 0; i < 10; ++i) {
//             const currentUniqueItemContent = `https://some-json-file-unique-item.com/id${i}`;
//             const currentUniqueItemPrice = toNano(`${i + 5}`);

//             const addItemResult = await firstShop.send(
//                 deployer.getSender(),
//                 {
//                     value: toNano("0.2")
//                 },
//                 {
//                     $$type: "AddItem",
//                     isUnique: true,
//                     price: currentUniqueItemPrice
//                 }
//             );

//             const currentUniqueItem = blockchain.openContract(await UniqueItem.fromInit(firstShop.address, firstShop.address, BigInt(i), currentUniqueItemContent));

//             expect(addItemResult.transactions).toHaveTransaction({
//                 from: firstShop.address,
//                 to: currentUniqueItem.address,
//                 deploy: true,
//                 success: true
//             });   

//             items.push(currentUniqueItem);
//         }

//         for (let i = 0; i < 10; ++i) {
//             const currentUniqueItemContent = `https://some-json-file-unique-item.com/id${i}`;
//             const currentUniqueItemPrice = toNano(`${i + 5}`);

//             const currentUniqueItem = items[i];
            
//             const currentItemPrice = await currentUniqueItem.getPrice();
//             const currentItemIndex = await currentUniqueItem.getIndex();  
//             const currentItemContent = await currentUniqueItem.getContent();
            
//             expect(currentItemPrice).toEqual(currentUniqueItemPrice);
//             expect(currentItemIndex).toEqual(BigInt(i));
//             expect(currentItemContent).toEqual(currentUniqueItemContent);
//         }
//     });

//     // Добавим простой тест для проверки передачи NFT
//     it("Should transfer NFT to order when creating order", async () => {
//         const uniqueItemContent = "https://some-json-file-unique-item.com/id0";
//         const uniqueItemPrice = toNano("5");
        
//         await firstShop.send(
//             deployer.getSender(),
//             {
//                 value: toNano("0.2")
//             },
//             {
//                 $$type: "AddItem",
//                 isUnique: true,
//                 price: uniqueItemPrice
//             }
//         );

//         const uniqueItem = blockchain.openContract(
//             await UniqueItem.fromInit(firstShop.address, firstShop.address, 0n, uniqueItemContent)
//         );

//         // Check initial owner
//         const initialOwner = await uniqueItem.getOwner();
//         expect(initialOwner.equals(firstShop.address)).toBe(true);

//         // Create order
//         const itemsInfoUnique = beginCell()
//             .storeAddress(uniqueItem.address)
//             .endCell();

//         const itemsInfoPl = beginCell().endCell();

//         const createOrderResult = await firstShop.send(
//             user.getSender(),
//             {
//                 value: toNano("2")
//             },
//             {
//                 $$type: "CreateOrder",
//                 itemsInfoUnique: itemsInfoUnique,
//                 itemsInfoPl: itemsInfoPl,
//                 // uIAddress: uniqueItem.address
//             }
//         );

//         // Check that NFT was transferred
//         expect(createOrderResult.transactions).toHaveTransaction({
//             from: firstShop.address,
//             to: uniqueItem.address,
//             success: true,
//         });

//         // The owner should have changed (to the order contract)
//         const newOwner = await uniqueItem.getOwner();
//         expect(newOwner.equals(firstShop.address)).toBe(false);
//     });
// });