import "./messages";
import "./structs";

contract Order {
    index: Int as uint256;
    seller: Address;
    buyer: Address? = null;
    
    plItemsCount: Int = 0;
    plItemsCountCheck: Int = 0;

    // sellerTotalPricePl: Int as coins = 0; // totalPrice, переданный из сообщения CreateOrderDeploy
    // sellerTotalPriceUnique: Int as coins = 0; // totalPrice, переданный из сообщения CreateOrderDeploy
    realTotalPricePl: Int as coins = 0;
    realTotalPriceUnique: Int as coins = 0;
    
    sellerItemsCountUnique: Int = 0;
    realItemsCountUnique: Int = 0;

    sellPermitedPl: Bool = false;
    sellPermitedUnique: Bool = false;

    completed: Bool = false;
    canceled: Bool = false;
    initialized: Bool = false;


    uniqueItems: List;
    plItems: List;

    init(seller: Address, index: Int) {
        self.seller = seller;
        self.index = index;
        self.uniqueItems = List {
            head: emptyCell()
        };
        self.plItems = List {
            head: emptyCell()
        };
    }
    
    receive() {
    }

    receive(msg: CreateOrderDeploy) {
        require(sender() == self.seller, "Only seller can create order");
        require(!self.initialized, "Order already initialized");
        self.initialized = true;
        self.buyer = msg.buyer;
        self.sellerItemsCountUnique = msg.uniqueItemsCount;
        
        try {
            let uniqueItemsSlice: Slice = msg.itemsInfoUnique.beginParse();
            
            let condition: Bool = true;
            while (condition) {
                while (uniqueItemsSlice.bits() >= 267) {
                    let uItemAddress: Address = uniqueItemsSlice.loadAddress();
                    
                    send(SendParameters {
                        to: uItemAddress,
                        value: ton("0.01"),
                        mode: SendIgnoreErrors,
                        body: GetPriceUnique {}.toCell(),
                    });
                }

                if (uniqueItemsSlice.refs() > 0) {
                    uniqueItemsSlice = uniqueItemsSlice.loadRef().beginParse();
                } else {
                    condition = false;
                }
            }
            self.uniqueItems.head = msg.itemsInfoUnique;    

            let plItemsInfoSlice: Slice = msg.itemsInfoPl.beginParse();
            let plItemsAddresses: Builder = beginCell();
            let next: Cell = emptyCell();
            
            condition = true;
            while (condition) {
                while (plItemsInfoSlice.bits() >= 267) {
                    let plItemAddress = plItemsInfoSlice.loadAddress();
                    let quantity = plItemsInfoSlice.loadUint(64);
                    self.plItemsCount += quantity;
                    
                    plItemsAddresses = plItemsAddresses.storeAddress(plItemAddress);
                    
                    send(SendParameters{
                        to: plItemAddress,
                        value: ton("0.01"),
                        body: GetPricePl {quantity: quantity}.toCell(),
                    });
                }
                
                plItemsAddresses = plItemsAddresses.storeRef(next);
                next = plItemsAddresses.endCell();
                
                if (plItemsInfoSlice.refs() > 0) {
                    plItemsInfoSlice = plItemsInfoSlice.loadRef().beginParse();
                } else {
                    condition = false;
                }
            }
            self.plItems.head = plItemsAddresses.endCell();
            self.reply("Order initialized".asComment());
            cashback(sender());

        } catch (err) {
           self.reply("Invalid itemsInfo".asComment());
           cashback(sender());
           return;
        }
    }

    receive(msg: Pay) {
        require(!self.completed, "Order already completed");
        require(self.plItemsCount == 0 || self.sellPermitedPl, "Sell is not permited yet (pl items inconsistency)"); 
        require(self.sellerItemsCountUnique == 0 || self.sellPermitedUnique, "Sell is not permited yet (unique items inconsistency)");
        require(context().value >= self.realTotalPricePl + self.realTotalPriceUnique, "Insufficient value");
        require(!self.canceled, "Order already canceled");
        require(self.initialized, "Order not initialized"); 
        require(self.buyer != null, "Buyer not set"); 


        if (self.sellerItemsCountUnique > 0) {
            let uniqueItemsSlice: Slice = self.uniqueItems.head.beginParse();
            self._transferAllUniqueItems(uniqueItemsSlice, self.buyer!!);
        }

        send(SendParameters {
            to: self.seller,
            value: self.realTotalPricePl + self.realTotalPriceUnique,
            body: OrderCompleted {orderIndex: self.index, buyer: self.buyer!!}.toCell()
        });

        self.completed = true;
        cashback(sender());
    }

    fun _transferAllUniqueItems(slice: Slice, newOwner: Address) {
        while (slice.bits() >= 267) { 
            let itemAddress = slice.loadAddress();
            
            send(SendParameters{
                to: itemAddress,
                value: ton("0.05"),
                body: NftTransfer {newOwner: newOwner}.toCell(),
            });
        }

        if (slice.refs() > 0) {
            self._transferAllUniqueItems(slice.loadRef().beginParse(), newOwner);
        }
    }

    // receive(msg: Pay) {
    //     require(!self.completed, "Order already completed");
    //     require(self.plItemsCount == 0 || self.sellPermitedPl, "Sell is not permited yet (pl items inconsistency)"); 
    //     require(self.sellerItemsCountUnique == 0 || self.sellPermitedUnique, "Sell is not permited yet (unique items inconsistency)");
    //     require(context().value >= self.realTotalPricePl + self.realTotalPriceUnique, "Insufficient value");
    //     require(!self.canceled, "Order already canceled");

    //     let slice: Slice = msg.uniqueItemsInfo.beginParse();

    //     let uniqueItemChecksumPrice: Int = 0;
    //     let uniqueItemChecksumCount: Int = 0;

    //     if (self.sellerItemsCountUnique > 0) {
    //         while (!slice.empty()) {
    //             let itemAddress = slice.loadAddress();
    //             let itemPrice = slice.loadUint(256);

    //             send(SendParameters{
    //                 to: itemAddress,
    //                 value: ton("0.05"),
    //                 body: NftTransfer {newOwner: self.buyer!!}.toCell(),
    //             });

    //             uniqueItemChecksumPrice += itemPrice;
    //             uniqueItemChecksumCount += 1;
    //         }
            
    //         require(uniqueItemChecksumPrice == self.realTotalPriceUnique, "Invalid input data (prices)");
    //         require(uniqueItemChecksumCount == self.realItemsCountUnique, "Invalid input data (quantity of items)");

    //     }
    //     send(SendParameters {
    //         to: self.seller,
    //         value: self.realTotalPricePl + self.realTotalPriceUnique,
    //         body: OrderCompleted {orderIndex: self.index, buyer: self.buyer!!}.toCell()
    //     });

    //     self.completed = true;
    // }

    receive(msg: GetPriceResponsePl) {
        require(!self.sellPermitedPl, "Already permitted");
        require(self.initialized, "Order not initialized yet");
        require(self.containsAddress(sender(), false), "Invalid item address - not in allowed PL items list");

        self.realTotalPricePl += msg.price; 
        self.plItemsCountCheck += msg.quantity;

        if (self.plItemsCountCheck == self.plItemsCount /* && self.realTotalPricePl == self.sellerTotalPricePl*/) {
            self.sellPermitedPl = true;
        }
    }

    receive(msg: GetPriceResponseUnique) {
        require(!self.sellPermitedUnique, "Already permitted");
        require(self.initialized, "Order not initialized yet");
        require(self.containsAddress(sender(), true), "Invalid item address - not in allowed Unique items list");

        self.realTotalPriceUnique += msg.price; 
        self.realItemsCountUnique += 1;
        if (self.realItemsCountUnique == self.sellerItemsCountUnique /* && self.realTotalPriceUnique == self.sellerTotalPriceUnique*/) {
            self.sellPermitedUnique = true;
        }
    }
    
    get fun containsAddress(target: Address, unique: Bool): Bool {
        let slice = unique ? self.uniqueItems.head.beginParse() : self.plItems.head.beginParse();
        return self._findAddress(slice, target);
    }

    fun _findAddress(slice: Slice, target: Address): Bool {
        while (slice.bits() >= 267) {
            let addr = slice.loadAddress();
            if (addr == target) {
                return true;
            }
        }

        if (slice.refs() > 0) {
            let found = self._findAddress(slice.loadRef().beginParse(), target);
            if (found) {
                return true;
            }
        }

        return false;
    }

    get fun index(): Int {
        return self.index;
    }

    get fun buyer(): Address? {
        return self.buyer;
    }

    get fun seller(): Address {
        return self.seller;
    }

    get fun totalPrice(): Int {
        return self.realTotalPricePl + self.realTotalPriceUnique;
    }

    get fun uniqueItemsCount(): Int {
        return self.sellerItemsCountUnique;
    }

    get fun totalItemsCount(): Int {
        return self.plItemsCount + self.realItemsCountUnique;
    }

    get fun itemsList(unique: Bool): Cell {
        return unique ? self.uniqueItems.head : self.plItems.head;
    }

    get fun completed(): Bool {
        return self.completed;
    }

    get fun initialized(): Bool {
        return self.initialized;
    }

    get fun canceled(): Bool {
        return self.canceled;
    }
}
