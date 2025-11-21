import "./messages";
import "./unique_item";
import "./product_line_item";
import "./order";

struct CollectionData {
    owner: Address?;
    nextItemIndex: Int as uint256;
    content: Cell;
}

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
        self.shopId = shopId;
    }

    fun requireOwner() {
        throwUnless(TactExitCodeAccessDenied, sender() == self.owner);
    }

    get fun owner(): Address? {
        return self.owner;
    }

    // deploy the shop (collection) — only parent can do that
    receive(msg: ShopDeploy) {
        require(sender() == self.parent, "Only parent can deploy");
        self.shopName = msg.shopName;
        self.owner = msg.shopOwner;
    }

    // ====== TEP-62 collection API ======
    // return collection metadata (content is shopName -> Cell)
    get fun get_collection_data(): CollectionData {
        let content_cell: Cell = emptyCell();
        if (self.shopName != null) {
            // convert String → Slice → Cell
            content_cell = self.shopName!!.asSlice().asCell();
        }

        return CollectionData {
            owner: self.owner,
            nextItemIndex: self.uniqueItemsCount,
            content: content_cell
        };
    }

    // compute address of NFT item by index (uses same init as uniqueItemInit)
    get fun get_nft_address_by_index(index: Int): Address {
        // allow computing future addresses too; if you want to restrict, use require(index < self.uniqueItemsCount)
        let init: StateInit = self.uniqueItemInit(index);
        return contractAddress(init);
    }

    // ====== Add item (unique or productline) ======
    receive(msg: AddItem) {
        self.requireOwner();

        if (msg.isUnique) {
            // prepare stateinit with collection=self, shop=self
            let init: StateInit = self.uniqueItemInit(self.uniqueItemsCount);

            // 1) deploy item by sending stateinit + NftItemDeploy (strict TEP-62)
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.2"),
                code: init.code,
                data: init.data,
                mode: SendPayGasSeparately,
                body: NftItemDeploy {
                    query_id: 0,
                    index: self.uniqueItemsCount,
                    owner: myAddress(), // initial owner is the collection (shop) by convention; can be changed
                    content: init.data  // we'll send content as cell (UniqueItem should parse it)
                }.toCell()
            });

            // 2) set initial price (separate message) — preserve your previous behavior
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.02"),
                mode: SendIgnoreErrors,
                body: SetPrice { newPrice: msg.price }.toCell()
            });

            self.uniqueItemsCount += 1;
        } else {
            let init: StateInit = self.productlineItemInit(self.productlineItemsCount);

            // deploy productline item (product line can accept immediate SetPrice like before)
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.2"),
                code: init.code,
                data: init.data,
                mode: SendPayGasSeparately,
                // body: ProductLineItemDeploy {
                //     // if your ProductLineItem expects a specific deploy msg, adapt here; otherwise use SetPrice below
                //     query_id: 0,
                //     index: self.productlineItemsCount,
                //     owner: myAddress(),
                //     content: init.data
                // }.toCell()
            });

            // set price
            send(SendParameters {
                to: contractAddress(init),
                value: ton("0.02"),
                mode: SendIgnoreErrors,
                body: SetPrice { newPrice: msg.price }.toCell()
            });

            self.productlineItemsCount += 1;
        }
    }

    // ====== Price setters (owner only) ======
    receive(msg: SetUniqueItemPrice) {
        self.requireOwner();
        send(SendParameters {
            to: msg.uniqueItem,
            value: ton("0.02"),
            mode: SendIgnoreErrors,
            body: SetPrice {newPrice: msg.newPrice}.toCell()
        });

        self.reply("Price setted".asComment());
    }

    receive(msg: SetPlItemPrice) {
        self.requireOwner();
        send(SendParameters {
            to: msg.plItem,
            value: ton("0.02"),
            mode: SendIgnoreErrors,
            body: SetPrice {newPrice: msg.newPrice}.toCell()
        });

        self.reply("Price setted".asComment());
    }

    // ====== Create order: transfer unique items to Order and deploy order ======
    receive(msg: CreateOrder) {
        try {
            let init: StateInit = self.orderInit(self.ordersCount);
            let uniqueItemsInfoSlice: Slice = msg.itemsInfoUnique.beginParse();
            let uniqueItemsCount: Int = 0;

            let condition: Bool = true;
            while(condition) {
                while (uniqueItemsInfoSlice.bits() >= 267) {
                    let uItemAddress = uniqueItemsInfoSlice.loadAddress();

                    // strict transfer call: we keep your NftTransfer shorthand — UniqueItem must implement TEP-62 transfer semantics
                    send(SendParameters{
                        to: uItemAddress,
                        value: ton("0.05"),
                        mode: SendPayGasSeparately,
                        body: NftTransfer { query_id: 0, new_owner: contractAddress(init), response_destination: myAddress(), custom_payload: null, forward_amount: 0, forward_payload: rawSlice("") }.toCell()
                    });

                    uniqueItemsCount += 1;
                }

                if (uniqueItemsInfoSlice.refs() > 0) {
                    uniqueItemsInfoSlice = uniqueItemsInfoSlice.loadRef().beginParse();
                } else {
                    condition = false;
                }
            }

            // deploy order (keep your higher value for order funding)
            send(SendParameters {
                to: contractAddress(init),
                value: ton("3"),
                body: CreateOrderDeploy {
                    itemsInfoPl: msg.itemsInfoPl,
                    itemsInfoUnique: msg.itemsInfoUnique,
                    uniqueItemsCount: uniqueItemsCount,
                    buyer: sender()
                }.toCell(),
                code: init.code,
                data: init.data,
                mode: SendPayGasSeparately
            });

            self.ordersCount += 1;
            cashback(sender());
        } catch (err) {
           self.reply("Invalid itemsInfo".asComment());
           cashback(sender());
           return;
        }
    }

    // ====== Order callbacks ======
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

    // ====== StateInit helpers ======
    get fun orderInit(index: Int): StateInit {
        return initOf Order(myAddress(), index);
    }

    get fun productlineItemInit(index: Int): StateInit {
        let content: StringBuilder = beginString();
        content.append("https://some-json-file-pl-item.com/id");
        content.append(index.toString());

        // product line item expected init(collection, shop, content, index) — keep unchanged
        return initOf ProductLineItem(myAddress(), myAddress(), content.toString(), index);
    }

    // UniqueItem init: collection = this shop, shop = this shop, index, content = unique URL
    get fun uniqueItemInit(index: Int): StateInit {
        let individual_content: StringBuilder = beginString();
        individual_content.append("https://some-json-file-unique-item.com/id");
        individual_content.append(index.toString());

        // UniqueItem(contract) expected signature: init(collection: Address, shop: Address, index: Int, content: String)
        return initOf UniqueItem(myAddress(), myAddress(), index, individual_content.toString());
    }

    // ====== getters ======
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
