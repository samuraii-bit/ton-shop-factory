import "./messages";
import "./unique_item";
import "./product_line_item";
import "./order";

contract Shop {
    parent: Address;
    owner: Address? = null;
    shopName: String? = null;
    uniqueItemsCount: Int as uint256 = 0;
    productlineItemsCount: Int as uint256 = 0;
    shopId: Int as uint256;
    ordersCount: Int as uint256 = 0;

    init(parent: Address, shopId: Int) {
        self.parent = parent;
        // self.owner = owner;
        // self.shopName = shopName;
        self.shopId = shopId;
    }

    fun requireOwner() {
        throwUnless(TactExitCodeAccessDenied, sender() == self.owner);
    }

    get fun owner(): Address? {
        return self.owner;
    }

    receive(msg: ShopDeploy) {
        require(sender() == self.parent, "Only parent can deploy");
        self.shopName = msg.shopName;
        self.owner = msg.shopOwner;
    }

    receive(msg: AddItem) {
        self.requireOwner();

        if (msg.isUnique) {
            let init: StateInit = self.uniqueItemInit(myAddress(), self.uniqueItemsCount);
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.2") + SendRemainingValue,
                code: init.code,
                data: init.data,
                body: SetPrice {newPrice: msg.price}.toCell()
            }); 

            self.uniqueItemsCount += 1;
        } else if (!msg.isUnique) {
            let init: StateInit = self.productlineItemInit(self.productlineItemsCount);
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.2") + SendRemainingValue,
                code: init.code,
                data: init.data,
                body: SetPrice {newPrice: msg.price}.toCell()
            }); 

            self.productlineItemsCount += 1;
        }

        // } else {
        //     let init:
        // }
    }

    receive(msg: SetUniqueItemPrice) {
        self.requireOwner();
        send(SendParameters {
            to: msg.uniqueItem,
            value: ton("0.02"),
            body: SetPrice {newPrice: msg.newPrice}.toCell()
        });

        self.reply("Price setted".asComment());
    }

    receive(msg: SetPlItemPrice) {
        self.requireOwner();
        send(SendParameters {
            to: msg.plItem,
            value: ton("0.02"),
            body: SetPrice {newPrice: msg.newPrice}.toCell()
        });

        self.reply("Price setted".asComment());
    }

    receive(msg: CreateOrder) {
        try {
            let init: StateInit = self.orderInit(self.ordersCount);
            let uniqueItemsInfoSlice: Slice = msg.itemsInfoUnique.beginParse();
            let uniqueItemsCount: Int = 0;

            let condition: Bool = true;
            while(condition) {
                while (uniqueItemsInfoSlice.bits() >= 267) {
                    let uItemAddress = uniqueItemsInfoSlice.loadAddress();

                    send(SendParameters{
                        to: uItemAddress,
                        value: ton("0.05"),
                        body: NftTransfer {newOwner: contractAddress(init)}.toCell(),
                    });

                    uniqueItemsCount += 1;
                }

                if (uniqueItemsInfoSlice.refs() > 0) {
                    uniqueItemsInfoSlice = uniqueItemsInfoSlice.loadRef().beginParse();
                } else {
                    condition = false;
                }
            }

            send(SendParameters {
                to: contractAddress(init),
                value: ton("3"),
                body: CreateOrderDeploy {
                    itemsInfoPl: msg.itemsInfoPl, 
                    itemsInfoUnique: msg.itemsInfoUnique,
                    // plItemsCount: plItemsCount,
                    uniqueItemsCount: uniqueItemsCount,
                    buyer: sender(),
                }.toCell(),
                code: init.code,
                data: init.data
            });            

            self.ordersCount += 1;
            cashback(sender());
        } catch (err) {
           self.reply("Invalid itemsInfo".asComment());
           cashback(sender());
           return;
        }
    }

    receive(msg: OrderCompleted) {
        let init: StateInit = self.orderInit(msg.orderIndex);
        require(contractAddress(init) == sender(), "Invalid data");
    }

    receive(msg: OrderCanceled) {
        let init: StateInit = self.orderInit(msg.orderIndex);
        require(contractAddress(init) == sender(), "Invalid data");
    }

    receive() {
        cashback(sender());
    }

    get fun orderInit(index: Int): StateInit {
        return initOf Order(myAddress(), index);
    }

    get fun productlineItemInit(index: Int): StateInit {
        let content: StringBuilder = beginString();     
        content.append("https://some-json-file-pl-item.com/id");
        content.append(index.toString());

        return initOf ProductLineItem(myAddress(), myAddress(), content.toString(), index);
    }

    get fun uniqueItemInit(owner: Address, index: Int): StateInit {
        let individual_content: StringBuilder = beginString();
        individual_content.append("https://some-json-file-unique-item.com/id");
        individual_content.append(index.toString());

        return initOf UniqueItem(owner, myAddress(), index, individual_content.toString());
    }

    get fun uniqueItemsCount(): Int {
        return self.uniqueItemsCount;
    }
    
    get fun plItemsCount(): Int {
        return self.productlineItemsCount;
    }

    get fun ordersCount(): Int {
        return self.ordersCount;
    }

    get fun shopName(): String? {
        return self.shopName;
    }
}
